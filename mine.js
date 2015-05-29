
jSize = 9;  // global variables
iSize = 9;
mSize = 10;

hasStarted = 0;
mNum = 10;
tNum = 90;

f=new Array();
for (i=0;i<30;i++) {
	f[i]=new Array();
	for (j=0;j<30;j++) {
		f[i][j]=0;
	}
}
unc=new Array();
for (i=0;i<30;i++) {
	unc[i]=new Array();
	for (j=0;j<30;j++) {
		unc[i][j]=0;
	}
}
flg=new Array();
for (i=0;i<30;i++) {
	flg[i]=new Array();
	for (j=0;j<30;j++) {
		flg[i][j]=0;
	}
}

function drawBoard(iIn,jIn,mIn) {
	var i,j;
	iSize = iIn;
	jSize = jIn;
	mSize = mIn;
	mNum = mSize;
	var htmlString = "";
	var locstr;
	htmlString = '<table cellpadding="0" align="center">';
	for (i = 0; i < iSize; i++) {
		htmlString += '<tr>';
		for (j=0; j < jSize; j++) {
			var locstr = "'sp"+toDoubleStr(i)+toDoubleStr(j)+"'";
			htmlString += '<td><img onclick="clickTile('+locstr+')" id='+locstr+' oncontextmenu="addFlag('+locstr+'); return false;" src="minesweeper/tile.png" width=16 height=16></td>';
		}
		htmlString += '</tr>';
	}
	htmlString += '</table>';
	document.getElementById("boardDiv").innerHTML = htmlString;
	newGame();
}


function addFlag(localstr) {
	var i = parseInt(localstr.substring(2,4));
	var j = parseInt(localstr.substring(4,6));
	if ((unc[i][j] == 0) && (mNum>0) && (hasStarted==1)) {
		if (flg[i][j] == 0) {
			document.getElementById(localstr).src = "minesweeper/flag.png";
			document.getElementById("theSmiley").src = "minesweeper/glasses.png";
			flg[i][j] = 1;
			mNum += -1;
			document.getElementById("mCount").innerHTML = mNum;
			if (mNum==0) {
				var reallyWon = 1;
				var i2,j2;
				for (i2=0;i2<iSize;i2++) {
					for (j2=0;j2<jSize;j2++) {
						if ((f[i2][j2]==-1) && (flg[i2][j2]==0)) {
							reallyWon = 0;
						}
					}
				}
				if (reallyWon == 1) {
					document.getElementById("mCountWin").innerHTML = "You identified all the Mines!";
				} else {
					document.getElementById("mCountWin").innerHTML = "You mis-identified the Mines<br>Innocents were killed";
					blownUp();
				}
			}
		} else {
			document.getElementById(localstr).src = "minesweeper/tile.png";
			document.getElementById("theSmiley").src = "minesweeper/smug.png";
			flg[i][j] = 0;
			mNum += 1;
			document.getElementById("mCount").innerHTML = mNum;
		}
	}
	return false;
}

function clickTile(localstr) 
{
	var i = parseInt(localstr.substring(2,4));
	var j = parseInt(localstr.substring(4,6));
	if (hasStarted == 0) {
		makeBoard(i,j);
	}
	if (hasStarted == 2) {
		document.getElementById("theSmiley").src = "minesweeper/huh.png";
	} else if (flg[i][j] == 1) {
		document.getElementById("theSmiley").src = "minesweeper/uncertain.png";
	} else if (unc[i][j] == 1) {
		flagUncover(i,j);
	} else if (f[i][j]>=0) {
		uncover(i,j);
	} else if (f[i][j]==-1) {
		blownUp();
		document.getElementById(localstr).src = "minesweeper/blown.png";
	} else {
		alert("interal calc error");
	}
}

function flagUncover(i,j) {
	var i2, j2, ip, jp;
	var fflag = 1;
	for (ip=-1;ip<=1;ip++) {
		for (jp=-1;jp<=1;jp++) {
			i2 = i+ip;
			j2 = j+jp;
			if (isInBounds(i2,j2)) {
				if ( ((flg[i2][j2]==1) && (f[i2][j2]!=-1)) || ((flg[i2][j2]==0) && (f[i2][j2]==-1))) {
					fflag = 0;
				}
			}
		}
	}
	if (fflag == 1) {
		for (ip=-1;ip<=1;ip++) {
			for (jp=-1;jp<=1;jp++) {
				i2 = i+ip;
				j2 = j+jp;
				if (isInBounds(i2,j2) && (unc[i2][j2]==0)) { // in-bounds and uncovered
					if (f[i2][j2]!=-1) {
						uncover(i2,j2);
					}
				}
			}
		}
	}
	if (f[i][j] == 0) {
		document.getElementById("theSmiley").src = "minesweeper/huh.png";
	} else {
		document.getElementById("theSmiley").src = "minesweeper/wink.png";
	}
}

function uncover(i,j) {
	var i2, j2, i3, j3, ip, jp;
	if (unc[i][j]==0) {
		reveal(i,j);
	}
	var finished;
	if (f[i][j]==0) {
		do {
			finished = 1;
			for (i2=0;i2<iSize;i2++) {
				for (j2=0;j2<jSize;j2++) {
					if ((unc[i2][j2]==1) && (f[i2][j2]==0)) {
						for (ip=-1;ip<=1;ip++) {
							i3 = i2 + ip;
							for (jp=-1;jp<=1;jp++) {
								j3 = j2 + jp;
								if (isInBounds(i3,j3) && (unc[i3][j3]==0)) {
									if (f[i3][j3]==0) {
										finished = 0;
									}
									reveal(i3,j3);
								}
							}
						}
					}
				}
			}
		} while (finished == 0);
		document.getElementById("theSmiley").src = "minesweeper/wink.png";
	} else {
		document.getElementById("theSmiley").src = "minesweeper/smile.png";
	}
}

function reveal(i,j) {
	var locstr = 'sp'+toDoubleStr(i)+toDoubleStr(j);
	if (f[i][j]==0) {
		document.getElementById(locstr).src = "minesweeper/grey.png";
	} else {
		document.getElementById(locstr).src = "minesweeper/"+f[i][j]+".png";
	}
	unc[i][j] = 1;
	tNum += -1;
	document.getElementById("tCount").innerHTML = tNum;
	if (tNum==0) {
		document.getElementById("tCountWin").innerHTML = "You cleared all the Mines!<br>Townspeople rejoice!";
	}
}

function blownUp()
{
	document.getElementById("theSmiley").src = "minesweeper/frown.png";
	for (i=0;i<iSize;i++) {
		for (j=0;j<jSize;j++) {
			if ((f[i][j]==-1) && (flg[i][j]==0)) {
				var locstr = 'sp'+toDoubleStr(i)+toDoubleStr(j);
				document.getElementById(locstr).src = "minesweeper/mine.png";
			}
		}
	}
	hasStarted = 2;
				
}

function newGame()
{
	document.getElementById("theSmiley").src = "minesweeper/smile.png";
	for (i=0;i<iSize;i++) {
		for (j=0;j<jSize;j++) {
			var locstr = 'sp'+toDoubleStr(i)+toDoubleStr(j);
			document.getElementById(locstr).src = "minesweeper/tile.png";
			f[i][j]=0;
			unc[i][j]=0;
			flg[i][j]=0;
		}
	}
	hasStarted = 0;
	tNum = iSize*jSize-mNum;
	scoreBoardReset(mSize,tNum);
}

function makeBoard(i,j) {
	var i2, j2, i3, j3, ip, jp;
	for (k=0;k<mSize;k++) {
		do {
			i2 = Math.floor((Math.random() * iSize) ); 
			j2 = Math.floor((Math.random() * jSize) ); 
		}
		while (((i==i2) && (j==j2)) || (f[i2][j2]==-1));
		f[i2][j2] = -1;
		for (ip=-1;ip<=1;ip++) {
			for (jp=-1;jp<=1;jp++) {
				i3 = i2+ip;
				j3 = j2+jp;
				if (isInBounds(i3,j3) && (f[i3][j3]>=0)) {
					f[i3][j3] += 1;
				}
			}
		}
	}
	hasStarted = 1;
	mNum = mSize;
	tNum = iSize*jSize-mNum;
	scoreBoardReset(mNum,tNum);
}

function scoreBoardReset(m,t) {
	document.getElementById("mCount").innerHTML = m;
	document.getElementById("tCount").innerHTML = t;
	document.getElementById("mCountWin").innerHTML = "--";
	document.getElementById("tCountWin").innerHTML = "--";
	
}

function toDoubleStr(i) {
	var strRet = "00";
	if (i<=9) {
		strRet = "0"+i.toString();
	} else if (i<=99) {
		strRet = i.toString();
	} else {
		alert("internal parse error");
	}
	return strRet;
}

function isInBounds(i,j) {
	return ((i>=0) && (i<iSize) && (j>=0) && (j<jSize));
}
