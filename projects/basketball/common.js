(function (global) {
  'use strict';

  const RapidFireFreeThrows = {
    initGame
  };

  global.RapidFireFreeThrows = RapidFireFreeThrows;

  function initGame(config) {
    const doc = config && config.document ? config.document : global.document;
    if (!doc) {
      throw new Error('Document is required to initialize the game.');
    }

    const canvas = doc.getElementById(config.canvasId || 'court');
    if (!canvas) {
      throw new Error('Canvas element not found.');
    }

    const gl = canvas.getContext('webgl2');
    const shootButton = doc.getElementById(config.shootButtonId || 'shoot');
    const stopButton = doc.getElementById(config.stopButtonId || 'stop');
    const hudScore = doc.getElementById(config.scoreId || 'score');
    const hudBalls = doc.getElementById(config.ballsId || 'balls');
    const hudTimer = doc.getElementById(config.timerId || 'timer');
    const angleSlider = doc.getElementById(config.angleSliderId || 'angle-control');
    const powerSlider = doc.getElementById(config.powerSliderId || 'power-control');
    const angleDisplay = doc.getElementById(config.angleDisplayId || 'angle-display');
    const powerDisplay = doc.getElementById(config.powerDisplayId || 'power-display');
    const historyBody = doc.querySelector(config.historyBodySelector || '#run-history tbody');
    const scoreFlash = config.scoreFlashId ? doc.getElementById(config.scoreFlashId) : doc.getElementById('score-flash');
    const level2Link = config.level2LinkId ? doc.getElementById(config.level2LinkId) : null;
    const level2LockText = config.level2LockTextId ? doc.getElementById(config.level2LockTextId) : null;
    const levelRequirement = config.levelRequirementId ? doc.getElementById(config.levelRequirementId) : null;
    const requirementLockedText =
      typeof config.requirementLockedText === 'string' ? config.requirementLockedText : null;
    const requirementUnlockedText =
      typeof config.requirementUnlockedText === 'string' ? config.requirementUnlockedText : null;
    const lockBanner = config.lockBannerId ? doc.getElementById(config.lockBannerId) : null;
    const winConfig = config.win || null;
    const winLink = winConfig && winConfig.linkId ? doc.getElementById(winConfig.linkId) : null;
    const winMessage = winConfig && winConfig.messageId ? doc.getElementById(winConfig.messageId) : null;
    const winThreshold = winConfig && typeof winConfig.threshold === 'number' ? winConfig.threshold : null;
    const winStorageKey = winConfig && winConfig.storageKey ? winConfig.storageKey : null;

    if (!gl) {
      if (shootButton) shootButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
      canvas.replaceWith(Object.assign(doc.createElement('p'), {
        textContent: 'WebGL2 is required to run this demo. Please try a modern browser!'
      }));
      return;
    }

    const worldWidth = 28;
    const worldHeight = 16;
    const gravity = -24;
    const floorHeight = 0.85;
    const floorY = floorHeight;
    const hoop = {
      x: 23.5,
      y: 9.6,
      radius: 0.95,
      innerRatio: 0.68,
      color: [0.85, 0.1, 0.1, 1.0]
    };
    const spawn = { x: 5, y: floorY + 1.65 };
    const wallRestitution = 0.76;
    const ballRestitution = 0.84;

    const spawnRate = config.spawnRate || 20;
    const spawnInterval = 1000 / spawnRate;
    const runDurationMs = config.runDurationMs || 10000;
    const simulationDurationMs = config.simulationDurationMs || 10300;
    const ballRadius = config.ballRadius || 0.36;

    const historyCookie = config.historyCookie || 'rapid_fire_runs_level1_v1';
    const levelKey = config.levelKey || (typeof historyCookie === 'string' && historyCookie.indexOf('level2') !== -1 ? 'level2' : 'level1');
    const isLevelTwo = levelKey === 'level2';
    const achievements = global.gameAchievements || null;
    const maxHistory = config.maxHistory || 10;
    const unlockStorageKey = config.unlockStorageKey || 'rapid_fire_free_throws_level2_unlocked';
    const unlockThreshold = typeof config.unlockThreshold === 'number' ? config.unlockThreshold : 70;
    const disableUntilUnlocked = Boolean(config.disableUntilUnlocked);

    const boardConfig = config.board || null;
    const board = boardConfig
      ? {
          width: boardConfig.width || 11.5,
          height: boardConfig.height || (boardConfig.width || 11.5) * (boardConfig.aspect || 264 / 8000),
          x: boardConfig.x || 19.2,
          y: boardConfig.y || 8.4,
          speed: boardConfig.speed || 13,
          restitution: boardConfig.restitution || 0.92,
          padding: boardConfig.padding || 0.6,
          verticalPadding: boardConfig.verticalPadding || 0.6,
          textureUrl: boardConfig.textureUrl || null,
          texture: null,
          locked: true,
          pointerId: null,
          offsetX: 0,
          offsetY: 0,
          pressedKeys: new Set()
        }
      : null;

    const blackHoleConfig = config.blackHole || null;
    const blackHole = blackHoleConfig
      ? {
          x: typeof blackHoleConfig.x === 'number' ? blackHoleConfig.x : worldWidth * 0.55,
          y: typeof blackHoleConfig.y === 'number' ? blackHoleConfig.y : worldHeight * 0.55,
          radius: typeof blackHoleConfig.radius === 'number' ? blackHoleConfig.radius : 2.6,
          eventHorizonRadius:
            typeof blackHoleConfig.eventHorizonRadius === 'number'
              ? blackHoleConfig.eventHorizonRadius
              : 1.45,
          influenceRadius:
            typeof blackHoleConfig.influenceRadius === 'number' ? blackHoleConfig.influenceRadius : 6.5,
          pullStrength: typeof blackHoleConfig.pullStrength === 'number' ? blackHoleConfig.pullStrength : 260,
          spinStrength: typeof blackHoleConfig.spinStrength === 'number' ? blackHoleConfig.spinStrength : 0,
          minDistance: typeof blackHoleConfig.minDistance === 'number' ? blackHoleConfig.minDistance : 1.0,
          consumeShrink:
            typeof blackHoleConfig.consumeShrink === 'number'
              ? Math.min(Math.max(blackHoleConfig.consumeShrink, 0.1), 0.95)
              : 0.65,
          color: Array.isArray(blackHoleConfig.color) ? blackHoleConfig.color : [0.1, 0.1, 0.16, 0.96],
          horizonColor: Array.isArray(blackHoleConfig.horizonColor)
            ? blackHoleConfig.horizonColor
            : [0.94, 0.52, 0.18, 0.92],
          glowColor: Array.isArray(blackHoleConfig.glowColor) ? blackHoleConfig.glowColor : [0.46, 0.6, 0.95, 0.32]
        }
      : null;

    const additionalLocks = Array.isArray(config.additionalLocks)
      ? config.additionalLocks
          .map(setupAdditionalLock)
          .filter(Boolean)
      : [];
    const additionalLockStates = new WeakMap();

    const balls = [];
    let score = 0;
    let shootStart = 0;
    let shootEnd = 0;
    let simulationEnd = 0;
    let lastSpawn = 0;
    let lastFrame = 0;
    let animationActive = false;
    let animationFrameId = null;
    let currentRun = null;
    let runHistory = loadHistoryFromCookie(historyCookie);
    let levelUnlocked = false;
    let flashTimeoutId = null;

    const circleGeometry = createCircleGeometry(gl, 48);
    const circleProgram = createCircleProgram(gl, circleGeometry);
    const rectProgram = createRectProgram(gl);
    const instanceBuffer = gl.createBuffer();
    const textureProgram = board ? createTextureProgram(gl) : null;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (board) {
      canvas.classList.add('board-enabled');
      canvas.style.touchAction = 'none';
      if (board.textureUrl) {
        loadBoardTexture(board.textureUrl);
      }
      setupBoardControls();
    }

    global.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    updateControls();
    renderHistory();
    levelUnlocked = updateLevelUnlockState();
    updateAdditionalLocks();
    updateWinState();
    renderScene();
    updateHud(performance.now());
    hideScoreFlash();

    if (shootButton) {
      shootButton.addEventListener('click', startNewRun);
      shootButton.disabled = disableUntilUnlocked && !levelUnlocked;
    }
    if (stopButton) {
      stopButton.addEventListener('click', () => finalizeRun('canceled'));
      stopButton.disabled = true;
    }

    if (angleSlider) {
      angleSlider.addEventListener('input', () => {
        updateControls();
        if (currentRun && currentRun.state === 'running') {
          currentRun.params.angleBoost = parseFloat(angleSlider.value);
        }
      });
    }

    if (powerSlider) {
      powerSlider.addEventListener('input', () => {
        updateControls();
        if (currentRun && currentRun.state === 'running') {
          currentRun.params.launchPower = parseFloat(powerSlider.value);
        }
      });
    }

    function startNewRun() {
      if (!levelUnlocked && disableUntilUnlocked) {
        return;
      }
      if (board && board.locked) {
        return;
      }

      const now = performance.now();

      if (currentRun && currentRun.state === 'running') {
        finalizeRun('canceled', now);
      }

      const initialAngle = parseFloat(angleSlider.value);
      const initialPower = parseFloat(powerSlider.value);

      balls.length = 0;
      score = 0;
      shootStart = now;
      shootEnd = shootStart + runDurationMs;
      simulationEnd = shootStart + simulationDurationMs;
      lastSpawn = shootStart;
      lastFrame = shootStart;
      animationActive = true;

      currentRun = {
        state: 'running',
        startedAt: now,
        params: {
          angleBoost: initialAngle,
          launchPower: initialPower,
          spawnRate,
          duration: simulationDurationMs / 1000
        }
      };

      if (blackHole) {
        currentRun.blackHoleConsumed = 0;
      }

      if (shootButton) shootButton.disabled = true;
      if (stopButton) stopButton.disabled = false;
      hideScoreFlash();
      updateHud(now);
      renderScene();

      if (animationFrameId !== null) {
        global.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = global.requestAnimationFrame(loop);
    }

    function spawnBall(time) {
      const angleAdjustment = parseFloat(angleSlider.value);
      const baseSpeed = parseFloat(powerSlider.value);
      const angleOffset = (Math.random() - 0.5) * 0.24;
      const baseTargetX = hoop.x - spawn.x;
      const baseTargetY = (hoop.y + 1.1) - spawn.y;
      const baseAngle = Math.atan2(baseTargetY, baseTargetX) + angleAdjustment;
      const angle = baseAngle + angleOffset;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const speed = baseSpeed + (Math.random() - 0.5) * 3.0;
      const newBall = {
        x: spawn.x + (Math.random() - 0.5) * 0.28,
        y: spawn.y + (Math.random() - 0.1) * 0.14,
        vx: directionX * speed + (Math.random() - 0.5) * 2.2,
        vy: directionY * speed + Math.random() * 1.4,
        radius: ballRadius * (0.95 + Math.random() * 0.1),
        active: true
      };
      balls.push(newBall);
      updateHud(time);
    }

    function updateHud(time) {
      if (hudScore) hudScore.textContent = `Score: ${score}`;
      if (hudBalls) hudBalls.textContent = `Balls in play: ${balls.filter(b => b.active).length}`;
      if (hudTimer) {
        const remaining = Math.max(0, (simulationEnd - time) / 1000);
        hudTimer.textContent = `Timer: ${remaining.toFixed(1)}s`;
      }
    }

    function updateControls() {
      if (angleSlider && angleDisplay) {
        const angleValue = parseFloat(angleSlider.value);
        const angleDegrees = angleValue * (180 / Math.PI);
        const formattedAngle = `${angleDegrees >= 0 ? '+' : ''}${angleDegrees.toFixed(1)}°`;
        angleDisplay.textContent = formattedAngle;
      }
      if (powerSlider && powerDisplay) {
        const powerValue = parseFloat(powerSlider.value);
        powerDisplay.textContent = `${powerValue.toFixed(1)} u/s`;
      }
    }

    function loop(now) {
      if (!animationActive || !currentRun || currentRun.state !== 'running') {
        animationFrameId = null;
        return;
      }

      if (!lastFrame) lastFrame = now;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);

      if (now < shootEnd) {
        while (lastSpawn <= now) {
          spawnBall(now);
          lastSpawn += spawnInterval;
        }
      }

      updatePhysics(dt, now);
      renderScene();
      lastFrame = now;

      if (!animationActive || !currentRun || currentRun.state !== 'running') {
        animationFrameId = null;
        return;
      }

      if (now >= simulationEnd) {
        animationFrameId = null;
        finalizeRun('completed', now);
        return;
      }

      animationFrameId = global.requestAnimationFrame(loop);
    }

    function finalizeRun(outcome, time = performance.now()) {
      if (!currentRun || currentRun.state !== 'running') {
        return;
      }

      const completedScore = outcome === 'completed' ? score : null;
      const consumedByBlackHole = blackHole && currentRun && Number.isFinite(currentRun.blackHoleConsumed)
        ? currentRun.blackHoleConsumed
        : 0;

      const record = {
        timestamp: new Date().toISOString(),
        angleBoost: currentRun.params.angleBoost,
        launchPower: currentRun.params.launchPower,
        spawnRate: currentRun.params.spawnRate,
        duration: currentRun.params.duration,
        score: completedScore,
        status: outcome,
        blackHoleConsumed: consumedByBlackHole
      };

      addRunRecord(record);
      saveHistory(runHistory);
      renderHistory();
      const previousLevelUnlockState = levelUnlocked;
      levelUnlocked = updateLevelUnlockState(completedScore, previousLevelUnlockState);
      updateAdditionalLocks(completedScore);
      updateWinState(completedScore);

      if (achievements && outcome === 'completed') {
        if (isLevelTwo && Number.isFinite(completedScore) && completedScore >= 180) {
          achievements.setStatus('basketball', 'basketball-curry-hurry', true);
        }
        if (Number.isFinite(completedScore) && completedScore === 0) {
          achievements.setStatus('basketball', 'basketball-zero-hero', true);
        }
        if (blackHole && consumedByBlackHole > 0) {
          const milestones = [
            { value: 100, id: 'basketball-black-hole-100' },
            { value: 150, id: 'basketball-black-hole-150' },
            { value: 180, id: 'basketball-black-hole-180' },
            { value: 195, id: 'basketball-black-hole-195' }
          ];
          milestones.forEach(milestone => {
            if (consumedByBlackHole >= milestone.value) {
              achievements.setStatus('basketball', milestone.id, true);
            }
          });
        }
      }

      currentRun.state = outcome;
      currentRun = null;
      animationActive = false;
      if (animationFrameId !== null) {
        global.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      balls.length = 0;
      lastSpawn = 0;
      lastFrame = 0;
      if (shootButton) shootButton.disabled = disableUntilUnlocked ? !levelUnlocked : false;
      if (stopButton) stopButton.disabled = true;
      shootEnd = 0;
      simulationEnd = time;
      updateHud(time);
      renderScene();

      if (outcome === 'completed') {
        showScoreFlash(score);
      } else {
        hideScoreFlash();
      }
    }

    function updatePhysics(dt, now) {
      if (board) {
        updateBoardFromKeys(dt);
      }

      const activeBalls = [];

      for (const ball of balls) {
        if (!ball.active) {
          continue;
        }

        if (blackHole) {
          applyBlackHoleForce(ball, dt);
        }

        ball.vy += gravity * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (blackHole && consumeBallInBlackHole(ball)) {
          continue;
        }

        if (ball.y - ball.radius < floorY) {
          ball.y = floorY + ball.radius;
          ball.vy = Math.abs(ball.vy) * wallRestitution;
          ball.vx *= 0.88;
        }
        const rightWall = worldWidth - 0.4;
        if (ball.x - ball.radius < 0.4) {
          ball.x = 0.4 + ball.radius;
          ball.vx = Math.abs(ball.vx) * wallRestitution;
        }
        if (ball.x + ball.radius > rightWall) {
          ball.x = rightWall - ball.radius;
          ball.vx = -Math.abs(ball.vx) * wallRestitution;
        }
        const ceiling = worldHeight - 0.3;
        if (ball.y + ball.radius > ceiling) {
          ball.y = ceiling - ball.radius;
          ball.vy = -Math.abs(ball.vy) * 0.65;
        }

        if (board) {
          handleBoardCollision(ball);
          if (!ball.active) {
            continue;
          }
        }

        const dx = ball.x - hoop.x;
        const dy = ball.y - hoop.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < (hoop.radius - ball.radius * 0.35) * (hoop.radius - ball.radius * 0.35)) {
          ball.active = false;
          score += 1;
          continue;
        }

        activeBalls.push(ball);
      }

      for (let i = 0; i < activeBalls.length; i++) {
        const a = activeBalls[i];
        for (let j = i + 1; j < activeBalls.length; j++) {
          const b = activeBalls[j];
          if (!a.active || !b.active) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const minDist = a.radius + b.radius;
          if (distSq > minDist * minDist) continue;
          const distance = Math.sqrt(distSq) || minDist;
          const nx = dx / distance;
          const ny = dy / distance;
          const penetration = minDist - distance;
          const correction = penetration / 2;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * nx + rvy * ny;
          if (velAlongNormal > 0) continue;
          const impulse = -(1 + ballRestitution) * velAlongNormal / 2;
          const impulseX = impulse * nx;
          const impulseY = impulse * ny;
          a.vx -= impulseX;
          a.vy -= impulseY;
          b.vx += impulseX;
          b.vy += impulseY;
        }
      }

      for (const ball of activeBalls) {
        if (!ball.active) continue;
        ball.vx *= 0.999;
        ball.vy *= 0.999;
      }

      for (let i = balls.length - 1; i >= 0; i--) {
        if (!balls[i].active) {
          balls.splice(i, 1);
        }
      }

      updateHud(now);
    }

    function renderScene() {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.54, 0.73, 0.95, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      drawRect(0, 0, worldWidth, floorHeight, [0.91, 0.6, 0.26, 1.0]);
      drawRect(0, Math.max(0, floorHeight - 0.16), worldWidth, 0.16, [0.75, 0.48, 0.2, 1.0]);
      drawRect(0, 0, 0.4, worldHeight, [0.82, 0.85, 0.92, 1]);
      if (!board) {
        drawRect(22.8, 7.8, 0.16, 4.2, [0.7, 0.7, 0.76, 1]);
        drawRect(22.96, 10.3, 0.7, 2.2, [0.96, 0.96, 0.98, 1]);
        drawRect(23.1, 10.55, 0.42, 1.7, [0.88, 0.9, 0.96, 1]);
      }

      if (blackHole) {
        drawCircle(blackHole.x, blackHole.y, blackHole.radius * 1.65, -1, blackHole.glowColor);
        drawCircle(blackHole.x, blackHole.y, blackHole.radius, 0.42, blackHole.color);
        drawCircle(blackHole.x, blackHole.y, blackHole.eventHorizonRadius, -1, blackHole.horizonColor);
      }

      drawCircle(hoop.x, hoop.y, hoop.radius, hoop.innerRatio, hoop.color);

      const playerFootY = floorY + 0.05;
      const playerBodyColor = [0.1, 0.18, 0.3, 1];
      drawRect(spawn.x - 1.3, playerFootY, 0.22, 1.35, playerBodyColor);
      drawRect(spawn.x - 0.88, playerFootY, 0.22, 1.32, playerBodyColor);
      const playerTorsoY = playerFootY + 1.28;
      drawRect(spawn.x - 1.28, playerTorsoY, 0.86, 1.18, playerBodyColor);
      drawRect(spawn.x - 1.68, playerTorsoY + 0.72, 0.72, 0.16, playerBodyColor);
      drawRect(spawn.x - 0.5, playerTorsoY + 0.62, 0.96, 0.16, playerBodyColor);
      drawCircle(spawn.x - 0.88, playerTorsoY + 1.65, 0.55, -1, [0.99, 0.89, 0.72, 1]);

      if (board) {
        if (board.texture) {
          drawTexturedRect(board);
        } else {
          drawRect(board.x - board.width / 2, board.y - board.height / 2, board.width, board.height, [0.9, 0.9, 0.95, 0.8]);
        }
      }

      if (balls.length) {
        const instanceData = new Float32Array(balls.length * 8);
        for (let i = 0; i < balls.length; i++) {
          const ball = balls[i];
          instanceData[i * 8 + 0] = ball.x;
          instanceData[i * 8 + 1] = ball.y;
          instanceData[i * 8 + 2] = ball.radius;
          instanceData[i * 8 + 3] = -1;
          instanceData[i * 8 + 4] = 1.0;
          instanceData[i * 8 + 5] = 0.5;
          instanceData[i * 8 + 6] = 0.0;
          instanceData[i * 8 + 7] = 1.0;
        }
        gl.useProgram(circleProgram.program);
        gl.bindVertexArray(circleProgram.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 8);
        gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 12);
        gl.vertexAttribDivisor(3, 1);
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 16);
        gl.vertexAttribDivisor(4, 1);
        gl.uniform2f(circleProgram.uniforms.uWorldSize, worldWidth, worldHeight);
        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circleGeometry.count, balls.length);
        gl.bindVertexArray(null);
      }
    }

    function drawCircle(x, y, radius, innerRatio, color) {
      gl.useProgram(circleProgram.program);
      gl.bindVertexArray(circleProgram.vao);
      const instance = new Float32Array([
        x,
        y,
        radius,
        innerRatio,
        color[0],
        color[1],
        color[2],
        color[3]
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, instance, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 0);
      gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 8);
      gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 16);
      gl.vertexAttribDivisor(4, 1);
      gl.uniform2f(circleProgram.uniforms.uWorldSize, worldWidth, worldHeight);
      gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, circleGeometry.count, 1);
      gl.bindVertexArray(null);
    }

    function drawRect(x, y, width, height, color) {
      gl.useProgram(rectProgram.program);
      gl.bindVertexArray(rectProgram.vao);
      const vertices = new Float32Array([
        x, y,
        x + width, y,
        x, y + height,
        x + width, y,
        x + width, y + height,
        x, y + height
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, rectProgram.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      gl.uniform2f(rectProgram.uniforms.uWorldSize, worldWidth, worldHeight);
      gl.uniform4f(rectProgram.uniforms.uColor, color[0], color[1], color[2], color[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    function drawTexturedRect(boardState) {
      if (!textureProgram || !boardState.texture) return;
      gl.useProgram(textureProgram.program);
      gl.bindVertexArray(textureProgram.vao);
      const halfW = boardState.width / 2;
      const halfH = boardState.height / 2;
      const left = boardState.x - halfW;
      const right = boardState.x + halfW;
      const bottom = boardState.y - halfH;
      const top = boardState.y + halfH;
      const vertices = new Float32Array([
        left, bottom, 0, 0,
        right, bottom, 1, 0,
        left, top, 0, 1,
        right, bottom, 1, 0,
        right, top, 1, 1,
        left, top, 0, 1
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, textureProgram.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
      gl.enableVertexAttribArray(1);
      gl.uniform2f(textureProgram.uniforms.uWorldSize, worldWidth, worldHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, boardState.texture);
      gl.uniform1i(textureProgram.uniforms.uTexture, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    function addRunRecord(record) {
      runHistory.push(record);
      runHistory = sortHistory(runHistory).slice(0, maxHistory);
    }

    function sortHistory(records) {
      return [...records].sort((a, b) => {
        const scoreA = Number.isFinite(a?.score) ? a.score : -Infinity;
        const scoreB = Number.isFinite(b?.score) ? b.score : -Infinity;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }

    function renderHistory() {
      if (!historyBody) return;
      historyBody.innerHTML = '';
      const fragment = doc.createDocumentFragment();
      runHistory.forEach((entry, index) => {
        const row = doc.createElement('tr');
        const rankCell = doc.createElement('td');
        rankCell.textContent = String(index + 1);
        row.appendChild(rankCell);

        const timeCell = doc.createElement('td');
        timeCell.textContent = new Date(entry.timestamp).toLocaleString();
        row.appendChild(timeCell);

        const angleCell = doc.createElement('td');
        angleCell.textContent = `${(entry.angleBoost * (180 / Math.PI)).toFixed(1)}°`;
        row.appendChild(angleCell);

        const powerCell = doc.createElement('td');
        powerCell.textContent = `${entry.launchPower.toFixed(1)} u/s`;
        row.appendChild(powerCell);

        const rateCell = doc.createElement('td');
        rateCell.textContent = `${entry.spawnRate} /s`;
        row.appendChild(rateCell);

        const durationCell = doc.createElement('td');
        durationCell.textContent = `${entry.duration.toFixed(1)} s`;
        row.appendChild(durationCell);

        const scoreCell = doc.createElement('td');
        scoreCell.textContent = entry.status === 'completed' && Number.isFinite(entry.score) ? entry.score : '—';
        row.appendChild(scoreCell);

        fragment.appendChild(row);
      });
      historyBody.appendChild(fragment);
    }

    function showScoreFlash(value) {
      if (!scoreFlash) return;
      if (flashTimeoutId !== null) {
        global.clearTimeout(flashTimeoutId);
      }
      scoreFlash.textContent = `Score: ${value}`;
      scoreFlash.classList.add('visible');
      flashTimeoutId = global.setTimeout(() => {
        flashTimeoutId = null;
        hideScoreFlash();
      }, 1500);
    }

    function hideScoreFlash() {
      if (!scoreFlash) return;
      scoreFlash.classList.remove('visible');
      if (flashTimeoutId !== null) {
        global.clearTimeout(flashTimeoutId);
        flashTimeoutId = null;
      }
    }

    function updateLevelUnlockState(latestScore = null, previousState = levelUnlocked) {
      const bestScore = computeUnlockScore();
      const unlockedFromScore = Number.isFinite(bestScore) && bestScore >= unlockThreshold;
      const unlockedFromStorage = getStoredUnlockFlag();
      const unlocked = unlockedFromScore || unlockedFromStorage;
      const previouslyUnlocked = Boolean(previousState);
      const justUnlocked = !previouslyUnlocked && unlocked;
      const unlockedFromLatestScore =
        justUnlocked && unlockedFromScore && Number.isFinite(latestScore) && latestScore >= unlockThreshold;

      if (unlockedFromScore && !unlockedFromStorage) {
        setStoredUnlockFlag(true);
      }

      if (level2Link) {
        if (unlocked) {
          level2Link.classList.remove('level-link--locked');
          level2Link.removeAttribute('aria-disabled');
          level2Link.removeAttribute('tabindex');
        } else {
          level2Link.classList.add('level-link--locked');
          level2Link.setAttribute('aria-disabled', 'true');
          level2Link.setAttribute('tabindex', '-1');
        }
      }

      if (level2LockText) {
        const defaultLockedText = `Score ${unlockThreshold}+ on Level 1 to unlock.`;
        const lockedTemplate =
          typeof config.unlockLockedText === 'string' ? config.unlockLockedText : defaultLockedText;
        const unlockedText =
          typeof config.unlockUnlockedText === 'string' ? config.unlockUnlockedText : 'Level 2 unlocked!';
        const message = unlocked
          ? unlockedText
          : formatTemplate(lockedTemplate, { threshold: unlockThreshold });

        level2LockText.textContent = message;
        level2LockText.hidden = !message || !message.trim().length;
      }

      updateRequirementMessage(unlocked, bestScore);

      if (lockBanner) {
        lockBanner.hidden = unlocked;
      }

      if (board) {
        board.locked = !unlocked;
      }

      if (disableUntilUnlocked) {
        if (shootButton) shootButton.disabled = !unlocked;
        if (!unlocked && stopButton) {
          stopButton.disabled = true;
        }
        if (!unlocked) {
          hideScoreFlash();
        }
      }

      if (typeof config.onUnlockStateChange === 'function') {
        config.onUnlockStateChange(unlocked, {
          bestScore,
          unlockedFromScore,
          unlockedFromStorage,
          latestScore,
          threshold: unlockThreshold,
          previouslyUnlocked,
          justUnlocked,
          unlockedFromLatestScore
        });
      }

      return unlocked;
    }

    function updateRequirementMessage(unlocked, bestScore) {
      if (!levelRequirement) {
        return;
      }

      const hasBestScore = Number.isFinite(bestScore) && bestScore > -Infinity;
      const bestScoreDisplay = hasBestScore ? Math.round(bestScore) : '—';
      const values = {
        threshold: unlockThreshold,
        bestScore: bestScoreDisplay
      };

      const unlockedTemplate =
        requirementUnlockedText !== null
          ? requirementUnlockedText
          : (typeof config.unlockUnlockedText === 'string' && config.unlockUnlockedText.trim().length > 0
              ? config.unlockUnlockedText
              : 'Next challenge unlocked! Best score: {bestScore}.');

      const lockedTemplate =
        requirementLockedText !== null
          ? requirementLockedText
          : 'Score {threshold}+ to unlock the next challenge. Your best score: {bestScore}.';

      const template = unlocked ? unlockedTemplate : lockedTemplate;

      levelRequirement.textContent = formatTemplate(template, values);
    }

    function updateAdditionalLocks(latestScore = null) {
      if (!additionalLocks.length) {
        return;
      }

      const helpers = {
        currentHistory: runHistory.slice(),
        getBestScoreCurrent: getBestScore,
        getBestScoreFromCookie: name => getBestScore(loadHistoryFromCookie(name))
      };

      for (const lock of additionalLocks) {
        const score = typeof lock.getUnlockScore === 'function'
          ? lock.getUnlockScore(helpers)
          : helpers.getBestScoreCurrent(helpers.currentHistory);
        const unlockedFromScore = Number.isFinite(score) && score >= lock.threshold;
        const unlockedFromStorage = lock.storageKey ? getStoredFlag(lock.storageKey) : false;
        const unlocked = unlockedFromScore || unlockedFromStorage;
        const previouslyUnlocked = Boolean(additionalLockStates.get(lock));
        const justUnlocked = !previouslyUnlocked && unlocked;
        const unlockedFromLatestScore =
          justUnlocked && unlockedFromScore && Number.isFinite(latestScore) && latestScore >= lock.threshold;

        if (unlockedFromScore && lock.storageKey && !unlockedFromStorage) {
          setStoredFlag(lock.storageKey, true);
        }

        additionalLockStates.set(lock, unlocked);

        if (lock.link) {
          if (unlocked) {
            lock.link.classList.remove('level-link--locked');
            lock.link.removeAttribute('aria-disabled');
            lock.link.removeAttribute('tabindex');
          } else {
            lock.link.classList.add('level-link--locked');
            lock.link.setAttribute('aria-disabled', 'true');
            lock.link.setAttribute('tabindex', '-1');
          }
        }

        if (lock.lockText) {
          const defaultLockedText = `Score ${lock.threshold}+ to unlock.`;
          const lockedTemplate =
            typeof lock.lockedText === 'string' ? lock.lockedText : defaultLockedText;
          const unlockedText = typeof lock.unlockedText === 'string' ? lock.unlockedText : 'Unlocked!';
          const message = unlocked
            ? unlockedText
            : formatTemplate(lockedTemplate, { threshold: lock.threshold });

          lock.lockText.textContent = message;
          lock.lockText.hidden = !message || !message.trim().length;
        }

        if (typeof lock.onUnlockStateChange === 'function') {
          lock.onUnlockStateChange(unlocked, {
            bestScore: score,
            unlockedFromScore,
            unlockedFromStorage,
            latestScore,
            threshold: lock.threshold,
            previouslyUnlocked,
            justUnlocked,
            unlockedFromLatestScore
          });
        }
      }
    }

    function updateWinState(latestScore = null) {
      if (!winConfig || !Number.isFinite(winThreshold)) {
        if (winLink) {
          winLink.hidden = true;
        }
        if (winMessage) {
          winMessage.hidden = true;
        }
        return false;
      }

      let bestScore = getBestScore(runHistory);
      if (Number.isFinite(latestScore) && latestScore > bestScore) {
        bestScore = latestScore;
      }

      const unlockedFromScore = Number.isFinite(bestScore) && bestScore >= winThreshold;
      const unlockedFromStorage = winStorageKey ? getStoredFlag(winStorageKey) : false;
      const unlocked = unlockedFromScore || unlockedFromStorage;

      if (unlockedFromScore && winStorageKey && !unlockedFromStorage) {
        setStoredFlag(winStorageKey, true);
      }

      if (winLink) {
        winLink.hidden = false;
        winLink.removeAttribute('hidden');
        winLink.removeAttribute('aria-hidden');

        if (unlocked) {
          winLink.classList.add('win-link--available');
          winLink.classList.remove('level-link--locked');
          winLink.removeAttribute('aria-disabled');
          winLink.removeAttribute('tabindex');
        } else {
          winLink.classList.remove('win-link--available');
          winLink.classList.add('level-link--locked');
          winLink.setAttribute('aria-disabled', 'true');
          winLink.setAttribute('tabindex', '-1');
        }
      }

      if (winMessage) {
        const lockedText = winConfig.lockedText
          ? String(winConfig.lockedText)
          : `Score ${winThreshold}+ on Level 2 to unlock the celebration.`;
        const baseUnlockedText = winConfig.unlockedText
          ? String(winConfig.unlockedText)
          : 'Victory unlocked! Celebrate your win below!';
        const unlockedCelebrationText = Number.isFinite(latestScore) && latestScore >= winThreshold
          ? `You scored ${Math.round(latestScore)}! ${baseUnlockedText}`
          : baseUnlockedText;
        winMessage.hidden = false;
        winMessage.textContent = unlocked ? unlockedCelebrationText : lockedText;
        winMessage.classList.toggle('win-progress--unlocked', unlocked);
      }

      if (typeof winConfig.onStateChange === 'function') {
        winConfig.onStateChange(unlocked, {
          bestScore,
          unlockedFromScore,
          unlockedFromStorage
        });
      }

      return unlocked;
    }

    function formatTemplate(template, replacements) {
      if (typeof template !== 'string' || !template) {
        return '';
      }

      return template.replace(/\{(\w+)\}|\$\{(\w+)\}/g, (match, key1, key2) => {
        const key = key1 || key2;
        if (Object.prototype.hasOwnProperty.call(replacements, key)) {
          return String(replacements[key]);
        }
        return match;
      });
    }

    function applyBlackHoleForce(ball, dt) {
      if (!blackHole) return;

      const dx = blackHole.x - ball.x;
      const dy = blackHole.y - ball.y;
      const distSq = dx * dx + dy * dy;
      const influenceSq = blackHole.influenceRadius * blackHole.influenceRadius;
      if (distSq > influenceSq) {
        return;
      }

      const distance = Math.sqrt(distSq) || blackHole.minDistance;
      const clampedDistance = Math.max(distance, blackHole.minDistance);
      const pull = blackHole.pullStrength / (clampedDistance * clampedDistance);
      const nx = dx / clampedDistance;
      const ny = dy / clampedDistance;
      ball.vx += nx * pull * dt;
      ball.vy += ny * pull * dt;

      if (blackHole.spinStrength) {
        const tx = -ny;
        const ty = nx;
        const spin = blackHole.spinStrength / Math.max(clampedDistance, 1);
        ball.vx += tx * spin * dt;
        ball.vy += ty * spin * dt;
      }
    }

    function consumeBallInBlackHole(ball) {
      if (!blackHole) return false;

      const dx = ball.x - blackHole.x;
      const dy = ball.y - blackHole.y;
      const distanceSq = dx * dx + dy * dy;
      const horizon = Math.max(0.1, blackHole.eventHorizonRadius - ball.radius * 0.25);
      if (distanceSq < horizon * horizon) {
        ball.active = false;
        ball.vx = 0;
        ball.vy = 0;
        ball.radius *= blackHole.consumeShrink;
        if (currentRun) {
          currentRun.blackHoleConsumed = (currentRun.blackHoleConsumed || 0) + 1;
        }
        return true;
      }
      return false;
    }

    function computeUnlockScore() {
      if (typeof config.getUnlockScore === 'function') {
        return config.getUnlockScore({
          currentHistory: runHistory.slice(),
          getBestScoreCurrent: getBestScore,
          getBestScoreFromCookie: name => getBestScore(loadHistoryFromCookie(name))
        });
      }
      return getBestScore(runHistory);
    }

    function getBestScore(records) {
      return records.reduce((best, record) => {
        if (Number.isFinite(record?.score) && record.score > best) {
          return record.score;
        }
        return best;
      }, -Infinity);
    }

    function setupAdditionalLock(lockConfig) {
      if (!lockConfig || typeof lockConfig !== 'object') {
        return null;
      }

      const thresholdValue = Number(lockConfig.unlockThreshold);
      return {
        link: lockConfig.linkId ? doc.getElementById(lockConfig.linkId) : null,
        lockText: lockConfig.lockTextId ? doc.getElementById(lockConfig.lockTextId) : null,
        threshold: Number.isFinite(thresholdValue) ? thresholdValue : 0,
        lockedText: typeof lockConfig.lockedText === 'string' ? lockConfig.lockedText : null,
        unlockedText: typeof lockConfig.unlockedText === 'string' ? lockConfig.unlockedText : null,
        storageKey: typeof lockConfig.storageKey === 'string' ? lockConfig.storageKey : null,
        getUnlockScore: typeof lockConfig.getUnlockScore === 'function' ? lockConfig.getUnlockScore : null,
        onUnlockStateChange:
          typeof lockConfig.onUnlockStateChange === 'function' ? lockConfig.onUnlockStateChange : null
      };
    }

    function loadHistoryFromCookie(name) {
      const cookieValue = getCookie(name);
      if (!cookieValue) {
        return [];
      }
      try {
        const parsed = JSON.parse(cookieValue);
        if (!Array.isArray(parsed)) {
          return [];
        }
        const normalized = parsed.map(normalizeRecord).filter(Boolean);
        return sortHistory(normalized).slice(0, maxHistory);
      } catch (error) {
        global.console.warn('Unable to parse saved runs', error);
        return [];
      }
    }

    function saveHistory(records) {
      try {
        setCookie(historyCookie, JSON.stringify(records.slice(0, maxHistory)));
      } catch (error) {
        global.console.warn('Unable to save run history', error);
      }
    }

    function normalizeRecord(entry) {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : null;
      if (!timestamp) {
        return null;
      }
      const angleBoost = Number(entry.angleBoost);
      const launchPower = Number(entry.launchPower);
      const rate = Number(entry.spawnRate);
      const duration = Number(entry.duration);
      const status = entry.status === 'completed' ? 'completed' : 'canceled';
      const scoreValue = Number(entry.score);
      return {
        timestamp,
        angleBoost: Number.isFinite(angleBoost) ? angleBoost : 0,
        launchPower: Number.isFinite(launchPower) ? launchPower : 0,
        spawnRate: Number.isFinite(rate) && rate > 0 ? Math.round(rate) : spawnRate,
        duration: Number.isFinite(duration) && duration > 0 ? duration : simulationDurationMs / 1000,
        score: status === 'completed' && Number.isFinite(scoreValue) ? Math.max(0, Math.floor(scoreValue)) : null,
        status
      };
    }

    function setCookie(name, value, days = 365) {
      const maxAge = Math.floor(days * 24 * 60 * 60);
      doc.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAge};path=/;SameSite=Lax`;
    }

    function getCookie(name) {
      const escapedName = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
      const match = doc.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : null;
    }

    function getStoredUnlockFlag() {
      return getStoredFlag(unlockStorageKey);
    }

    function setStoredUnlockFlag(value) {
      setStoredFlag(unlockStorageKey, value);
    }

    function getStoredFlag(key) {
      if (!key) {
        return false;
      }
      try {
        return global.localStorage.getItem(key) === 'true';
      } catch (error) {
        return false;
      }
    }

    function setStoredFlag(key, value) {
      if (!key) {
        return;
      }
      try {
        if (value) {
          global.localStorage.setItem(key, 'true');
        } else {
          global.localStorage.removeItem(key);
        }
      } catch (error) {
        // storage may be unavailable
      }
    }

    function resizeCanvas() {
      const dpr = global.devicePixelRatio || 1;
      const displayWidth = Math.floor(canvas.clientWidth * dpr);
      const displayHeight = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }

    function buildProgram(glContext, vertexSource, fragmentSource) {
      const vertexShader = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
      const fragmentShader = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
      const program = glContext.createProgram();
      glContext.attachShader(program, vertexShader);
      glContext.attachShader(program, fragmentShader);
      glContext.linkProgram(program);
      if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
        const info = glContext.getProgramInfoLog(program);
        glContext.deleteProgram(program);
        glContext.deleteShader(vertexShader);
        glContext.deleteShader(fragmentShader);
        throw new Error(`Program link failed: ${info}`);
      }
      glContext.deleteShader(vertexShader);
      glContext.deleteShader(fragmentShader);
      return program;
    }

    function compileShader(glContext, type, source) {
      const shader = glContext.createShader(type);
      glContext.shaderSource(shader, source);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        const info = glContext.getShaderInfoLog(shader);
        glContext.deleteShader(shader);
        throw new Error(`Shader compile failed: ${info}`);
      }
      return shader;
    }

    function createCircleGeometry(glContext, segments) {
      const vertices = new Float32Array((segments + 2) * 2);
      vertices[0] = 0;
      vertices[1] = 0;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        vertices[(i + 1) * 2] = Math.cos(angle);
        vertices[(i + 1) * 2 + 1] = Math.sin(angle);
      }
      const buffer = glContext.createBuffer();
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);
      return { buffer, count: segments + 2 };
    }

    function createCircleProgram(glContext, geometry) {
      const vertexSource = `#version 300 es\nlayout(location = 0) in vec2 aVertex;\nlayout(location = 1) in vec2 aCenter;\nlayout(location = 2) in float aRadius;\nlayout(location = 3) in float aInnerRatio;\nlayout(location = 4) in vec4 aColor;\nuniform vec2 uWorldSize;\nout vec2 vLocal;\nout float vInnerRatio;\nout vec4 vColor;\nvoid main() {\n  vec2 worldPos = aCenter + aVertex * aRadius;\n  vec2 normalized = worldPos / uWorldSize;\n  vec2 clip = normalized * 2.0 - 1.0;\n  vLocal = aVertex;\n  vInnerRatio = aInnerRatio;\n  vColor = aColor;\n  gl_Position = vec4(clip, 0.0, 1.0);\n}`;
      const fragmentSource = `#version 300 es\nprecision highp float;\nin vec2 vLocal;\nin float vInnerRatio;\nin vec4 vColor;\nout vec4 outColor;\nvoid main() {\n  float dist = length(vLocal);\n  if (dist > 1.0) discard;\n  if (vInnerRatio >= 0.0 && dist < vInnerRatio) discard;\n  outColor = vColor;\n}`;
      const program = buildProgram(glContext, vertexSource, fragmentSource);
      const vao = glContext.createVertexArray();
      glContext.bindVertexArray(vao);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, geometry.buffer);
      glContext.vertexAttribPointer(0, 2, glContext.FLOAT, false, 0, 0);
      glContext.enableVertexAttribArray(0);
      glContext.bindVertexArray(null);
      return {
        program,
        vao,
        uniforms: {
          uWorldSize: glContext.getUniformLocation(program, 'uWorldSize')
        }
      };
    }

    function createRectProgram(glContext) {
      const vertexSource = `#version 300 es\nlayout(location = 0) in vec2 aPosition;\nuniform vec2 uWorldSize;\nuniform vec4 uColor;\nout vec4 vColor;\nvoid main() {\n  vec2 normalized = aPosition / uWorldSize;\n  vec2 clip = normalized * 2.0 - 1.0;\n  vColor = uColor;\n  gl_Position = vec4(clip, 0.0, 1.0);\n}`;
      const fragmentSource = `#version 300 es\nprecision highp float;\nin vec4 vColor;\nout vec4 outColor;\nvoid main() {\n  outColor = vColor;\n}`;
      const program = buildProgram(glContext, vertexSource, fragmentSource);
      const vao = glContext.createVertexArray();
      const buffer = glContext.createBuffer();
      glContext.bindVertexArray(vao);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.vertexAttribPointer(0, 2, glContext.FLOAT, false, 0, 0);
      glContext.enableVertexAttribArray(0);
      glContext.bindVertexArray(null);
      return {
        program,
        vao,
        buffer,
        uniforms: {
          uWorldSize: glContext.getUniformLocation(program, 'uWorldSize'),
          uColor: glContext.getUniformLocation(program, 'uColor')
        }
      };
    }

    function createTextureProgram(glContext) {
      const vertexSource = `#version 300 es\nlayout(location = 0) in vec2 aPosition;\nlayout(location = 1) in vec2 aTexCoord;\nuniform vec2 uWorldSize;\nout vec2 vTexCoord;\nvoid main() {\n  vec2 normalized = aPosition / uWorldSize;\n  vec2 clip = normalized * 2.0 - 1.0;\n  vTexCoord = aTexCoord;\n  gl_Position = vec4(clip, 0.0, 1.0);\n}`;
      const fragmentSource = `#version 300 es\nprecision highp float;\nin vec2 vTexCoord;\nuniform sampler2D uTexture;\nout vec4 outColor;\nvoid main() {\n  outColor = texture(uTexture, vTexCoord);\n}`;
      const program = buildProgram(glContext, vertexSource, fragmentSource);
      const vao = glContext.createVertexArray();
      const buffer = glContext.createBuffer();
      glContext.bindVertexArray(vao);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.vertexAttribPointer(0, 2, glContext.FLOAT, false, 16, 0);
      glContext.enableVertexAttribArray(0);
      glContext.vertexAttribPointer(1, 2, glContext.FLOAT, false, 16, 8);
      glContext.enableVertexAttribArray(1);
      glContext.bindVertexArray(null);
      return {
        program,
        vao,
        buffer,
        uniforms: {
          uWorldSize: glContext.getUniformLocation(program, 'uWorldSize'),
          uTexture: glContext.getUniformLocation(program, 'uTexture')
        }
      };
    }

    function loadBoardTexture(url) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        board.texture = texture;
        board.width = boardConfig.width || board.width;
        board.height = boardConfig.height || (board.width * (image.height / image.width));
        clampBoardPosition(board);
        renderScene();
      };
      image.onerror = (error) => {
        global.console.warn('Unable to load board texture', error);
      };
      image.src = url;
    }

    function setupBoardControls() {
      if (!board) return;
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      global.addEventListener('pointerup', onPointerUp);
      global.addEventListener('pointercancel', onPointerUp);
      global.addEventListener('keydown', onKeyDown);
      global.addEventListener('keyup', onKeyUp);
    }

    function updateBoardFromKeys(dt) {
      if (!board || board.locked || !board.pressedKeys.size) {
        return;
      }
      let dx = 0;
      let dy = 0;
      if (board.pressedKeys.has('arrowleft') || board.pressedKeys.has('a')) dx -= 1;
      if (board.pressedKeys.has('arrowright') || board.pressedKeys.has('d')) dx += 1;
      if (board.pressedKeys.has('arrowup') || board.pressedKeys.has('w')) dy += 1;
      if (board.pressedKeys.has('arrowdown') || board.pressedKeys.has('s')) dy -= 1;
      if (!dx && !dy) {
        return;
      }
      const length = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / length) * board.speed * dt;
      dy = (dy / length) * board.speed * dt;
      setBoardPosition(board.x + dx, board.y + dy);
    }

    function handleBoardCollision(ball) {
      if (!board || board.locked) return;
      const halfW = board.width / 2;
      const halfH = board.height / 2;
      const left = board.x - halfW;
      const right = board.x + halfW;
      const bottom = board.y - halfH;
      const top = board.y + halfH;
      const closestX = Math.max(left, Math.min(ball.x, right));
      const closestY = Math.max(bottom, Math.min(ball.y, top));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= ball.radius * ball.radius) {
        return;
      }
      const distance = Math.sqrt(distanceSq) || ball.radius;
      const nx = distance ? dx / distance : 0;
      const ny = distance ? dy / distance : 1;
      const penetration = ball.radius - distance;
      ball.x += nx * penetration;
      ball.y += ny * penetration;
      const velocityDotNormal = ball.vx * nx + ball.vy * ny;
      if (velocityDotNormal > 0) {
        return;
      }
      const restitution = board.restitution;
      const impulse = -(1 + restitution) * velocityDotNormal;
      ball.vx += impulse * nx;
      ball.vy += impulse * ny;
    }

    function setBoardPosition(x, y) {
      if (!board) return;
      board.x = x;
      board.y = y;
      clampBoardPosition(board);
      renderScene();
    }

    function clampBoardPosition(boardState) {
      if (!boardState) return;
      const halfW = boardState.width / 2;
      const halfH = boardState.height / 2;
      const minX = halfW + boardState.padding;
      const maxX = worldWidth - halfW - boardState.padding;
      const minY = floorY + halfH + boardState.verticalPadding;
      const maxY = worldHeight - halfH - boardState.verticalPadding;
      boardState.x = Math.min(Math.max(boardState.x, minX), maxX);
      boardState.y = Math.min(Math.max(boardState.y, minY), maxY);
    }

    function onPointerDown(event) {
      if (!board || board.locked) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * worldWidth;
      const y = worldHeight - ((event.clientY - rect.top) / rect.height) * worldHeight;
      if (!pointInsideBoard(x, y, board)) {
        return;
      }
      board.pointerId = event.pointerId;
      board.offsetX = x - board.x;
      board.offsetY = y - board.y;
      canvas.setPointerCapture(board.pointerId);
      canvas.classList.add('board-dragging');
    }

    function onPointerMove(event) {
      if (!board || board.pointerId === null || event.pointerId !== board.pointerId) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * worldWidth;
      const y = worldHeight - ((event.clientY - rect.top) / rect.height) * worldHeight;
      setBoardPosition(x - board.offsetX, y - board.offsetY);
    }

    function onPointerUp(event) {
      if (!board || board.pointerId === null || (event && event.pointerId !== board.pointerId)) {
        return;
      }
      canvas.releasePointerCapture(board.pointerId);
      board.pointerId = null;
      canvas.classList.remove('board-dragging');
    }

    function onKeyDown(event) {
      if (!board || board.locked) return;
      board.pressedKeys.add(event.key.toLowerCase());
    }

    function onKeyUp(event) {
      if (!board) return;
      board.pressedKeys.delete(event.key.toLowerCase());
    }

    function pointInsideBoard(x, y, boardState) {
      const halfW = boardState.width / 2;
      const halfH = boardState.height / 2;
      return (
        x >= boardState.x - halfW &&
        x <= boardState.x + halfW &&
        y >= boardState.y - halfH &&
        y <= boardState.y + halfH
      );
    }
  }
})(window);
