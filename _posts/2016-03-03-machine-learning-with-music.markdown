---
layout: post
comments: true
title:  "Gordon Fierce Iron Yard Talk Links"
date:   2016-03-03 18:00:00 -0500
categories: TIY machine_learning music
---

Yesterday I made it out to an Iron Yard presentation 
[Gordon Fierce: Music Generation & Machine Learning][pres], and I just 
wanted to link all the things in a blog post. This was about using code
to make music. Using machine learning to make music is a challenge.

Within the first few minutes of arriving, I discovered that writing 
\\a to the console on a mac will make an error sound. I already put together
a pranking dream with this. We can make error sounds at random sounds, and
if we upload it to PyPI, we can make the instructions super quick to execute,
and then run the program in the background, only beeping randomly at long
average intervals. That would be infuriating, and hilarious.

{% highlight python %}
import random
import time
from math import exp

for i in range(100):
  r = random.randint(0, 100)
  time.sleep(100./r)
  print('\a')
{% endhighlight %}

On to the content of the presentation.

## Music Software

This wasn't really formally a part of the presentation, but I did notice
Gordon was using these free tools to make jams on the Mac:

 - [reaper][reaper]
 - [sonic-pi][sonic-pi]

It looks like you can do quite a lot with this stuff. Somewhere in the
capabilities is the ability to use [MIDI][MIDI]. I had heard that term
somewhere before, but I didn't know what the heck it was. Turns out, it's
basically like instructions for how to play an instrument that a computer
can follow.

### Machines Making Music

That's a pretty cool concept. Even cooler is the obvious fact that machine
learning will work a lot faster and a lot better if we work on the smaller
sample set of actions to take on an instrument, as opposed to just throwing
in a full sound waveform and hoping that using more computational power
will turn it into some comprehensible patterns.

Some people have apparently gone way further than this. They've used
sheet music to make the problem even more tractable for machines,
with generic cords or notes to learn on and reproduce. This was done
for traditional Scottish music I think. I didn't get the link for that.

## Machine Learning

[Tensor flow][tensor] is something that Google is doing and has open-sourced,
which came up. We went over a pretty awesome
[blog post about neural networks][karpathy-post] that has some amazingly
creepy examples of what computers have produced by Recurrent Neural Nets,
which are very powerful. That [blog][karpathy] is a pretty nice read in
general (although I haven't exactly gotten around to it).

## Light Simulator

[This javascript light simulator][light-game] is extremely fun. I don't
remember what it had to do with the other topics. It's just cool.



[pres]: http://www.meetup.com/The-Iron-Yard-Alumni-Presentation-Interactive/events/229085698/
[reaper]: http://www.reaper.fm/download.php
[sonic-pi]: http://sonic-pi.net/
[MIDI]: https://en.wikipedia.org/wiki/MIDI
[light-game]: https://benedikt-bitterli.me/tantalum/tantalum.html
[tensor]: https://www.tensorflow.org/
[karpathy]: http://karpathy.github.io/
[karpathy-post]: http://karpathy.github.io/2015/05/21/rnn-effectiveness/

