---
layout: post
title: "Castle Ledger: Charting a Myst-Style Expedition"
date: 2025-10-01 09:00:00 -0500
excerpt: "How the Castle Ledger text adventure grew from two prompts into the site's richest AI-authored game."
---

The Castle Ledger project has officially joined the blog, and it feels worthy of the fanfare. In just two prompts the adventure sprawled from a ring road tour into a bustling medieval keep complete with guard rotations, economic puzzles, and a cookie-backed inventory. This post documents the lightning-fast exchange that sparked the design, why it works so well as a text-driven experience, and how the follow-up tweaks sharpened the game's usability.

## The Initial Challenge

Everything began with a single request that set the tone for the entire build:

> Now I want you to make a new game.
>
> I want you to think like the game "Myst", but in pure HTML. Each "room" is just a bunch of text (still nicely formatted in html). This is mostly exploration by clicking, where each click goes to another room, but some rooms will have a person who will ask you questions, and you have the option of giving several answers.
>
> You will have a persistent inventory maintained by the same cookie system as the rest of the app. These should be real items you would have found. No magic in this world, but as brutally accurate to the real English midevil setting as possible. The inventory should consist of 7 items, which will be relevant to the plot and to getting other places. Like, one item will be the meat. You will make up the rest of the things, and their interaction with the world and objectives. Items will have an integer value for the number you have. One is presumably gold... which can buy the meat from someone.
>
> Browser cookies also need to contain some environmental data. For instance, if there is a guard dog and you give it meat, the dog may leave that "room" and go to another room where it will be eating the meat. The browser cookie needs to record the fact that the dog has been given the meat.
>
> The environment will be a castle. You will start outside the castle. There is a drawbridge in the front of the castle, and a smaller drawbridge in the back. On the sides there's the possibility for entry via some other creative way, like swimming. This makes for 4 entrances. There should be 2 mid-point rooms between each room in front of the 4 entrances. So you should be able to wall fully around the castle via 4x3=12 clicks. Each room should contain text embellishing on the experience of being there, since there is something historically accurate in each place. Like children playing, shanty towns, a church, someone selling meat, etc.... but you need to fill in way way more detail. At least every other of these 12 ring rooms should have an alternative detour path that leads to another scene, like the ability to go further into the shanty town. You need to collect things to unlock other things that can be used to solve puzzles to gain access to get into the castle. But you've got to fill in a LOT for all of this.
>
> Once the person gets into the castle, that's not all, oh no. The inside of the castle needs to be expansive and lively. There are training grounds, blacksmith, and many many other things, fill in details to a great extent. There are more items you can exchange and gain here. There is also a great hall with many rooms inside of it. There's also the court where things can happen. Keep things dynamic. Like if you go in the court, it rotates through 5 different cases the king is hearing as people are bringing their cases there for arbitration. Somewhere the guard station is the "news" processing getting messages from pidegon or whatever. This station will inform you that something terrible is about to happen and you must deliver a scroll to the master-at-arms, or else! Then you fill in the rest of the puzzles and story, make up an ending, and so on.
>
> This goes in the game list as the 4th game. Follow pattern on everything else.

That single message dictated the ring-road structure, the historically grounded inventory, and the need for persistent world states. The HTML-first approach paired perfectly with the Myst inspiration: paragraphs of atmospheric description, branching detours, and puzzle locks that hinge on observation.

## Refinement Through Play-Testing

The second prompt arrived after the first playable build and reads like thorough QA notes:

> This needs a link added from the main index. The coat of arms unicode seems perfect to go with it.
>
> I got to
>
>> Mill Jetty and Sluice
>
> and clicked
>
>> Use your rope skills to splice a new loop for the sluice
>
> but it seems to be unresponsive when I click this. No numbers change and I don't go anywhere. I don't see any errors in the console.
>
> I also think the "Recent notation" is too hard to notice. It's too far down in the page. Maybe if you just changed it to not span the whole width, but nest under the main text to the left of the Ledger & Inventory that would be better.
>
> Also, this is actually kind of hard. Can you make a new basic html page that gives "spoilers" and just outlines what you would do to beat the game? Link this from the Achievements page.

> The 2nd prompt was the product of some play-testing. Note that this is the most complete game for this level of prompts - trusting the AI to generate a large amount of story and content on its own. This was somewhat expected as a text-based game, which is where current LLMs are much better than with other problems.

Addressing those notes yielded the spoiler guide, moved the activity log into a more discoverable location, and even rewarded the sluice repair with silver pennies so that the action has immediate feedback. The feedback loop shows how a single iteration can transform usability while preserving the sweeping narrative.

## Why Castle Ledger Works

A Myst-style layout thrives on text because prose can quickly render NPC motivations, weather patterns, and the sensation of creeping through a keep at dawn. Castle Ledger leans into that strength:

* **Persistent cookies** capture inventory quantities and environmental shifts (the kennel mastiff roaming after being fed) so revisiting spaces feels alive.
* **Ring-road navigation** keeps the exterior loop manageable while detours dive into shanty towns, chapels, and marsh paths for world-building.
* **Interior density** introduces training grounds, the court's rotating petitions, and urgent courier duties that reshape objectives mid-run.

Combined, those traits make the game the densest experience on the site despite being entirely text-driven.

## Ongoing Tweaks

The latest polish pass adds grouped achievement headers so players can clearly confirm when they've wrapped the Castle Ledger questline. It also inspired this write-up—a dedicated spot to celebrate how far a pair of prompts can go when the content leans into world-building instead of complex visuals.

Give Castle Ledger a spin, glance at the spoiler page if you need a nudge, and enjoy the most expansive experiment to emerge from the Game Zone so far.
