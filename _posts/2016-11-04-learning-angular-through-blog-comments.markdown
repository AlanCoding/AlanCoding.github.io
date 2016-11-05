---
layout: post
comments: true
title:  "Learning Javascript through Disqus Hacking"
date:   2016-03-03 18:00:00 -0500
categories: angular javascript
---

Using cargo cult code is like wearing cargo pants. People might
make fun of you for wearing them, but they're quite practical.

When I first tried to add comments to this blog, it seemed that I had
picked the wrong cult to join. Granted, I might not have been very
good at debugging javascript at that time. But with great frustration,
I pushed commit after commit and did not see anything appear. I will
try to go into an autopsy of that code, but first...

## What Did Work

I stole Leigh Johnson's [code from here][lj], which was originally stolen
from yet another source. At least I can kind of explain this code now.

{% highlight javascript %}

(function() {
    var d = document.createElement('script');
    d.type = 'text/javascript';
    d.async = true;
    d.src = '//alancoding.disqus.com/embed.js';
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(d);
})();
{% endhighlight %} 

NOTE: please tell me everything I have horribly wrong here in comments,
because I probably am wrong.

Going from the outer layer first, this is a function definition. However,
the syntax with the brackets at the end executes it. So this 

Within this function, you start off with the document. Then you create
a `script` element, which establishes its own scope. Inside of this
namespace, a few more variables are attached, particularly type, async,
and src.

Next, inside of the OR condition within brackets, I _think_ that
we are attempting to grab the document head. If that doesn't work (resolves
to false as well), then we try to grab the document body. Presumably either
will work, but this is trying to get compatibility with different DOM
structures.

After we have that element, the script element is appended to it.

Beyond that, it's hard to say what happens. It executes the Disqus code.
I'm guessing that it injects HTML (and other stuff) into whatever place
the bounding \<script\> tags defined. It probably does a lot of relatively
sophisticated stuff.

## What I Got Wrong

Using the function disqus_config() constituted a fairly major red herring.
Really, that was defined in the imported script from Disqus proper.
But then things got complicated. What version of this method was really
working in what context?

The door was left open for multiple different kinds of errors. Could
it have been that `d.head` just didn't work and threw some blocking errors?
Maybe the Date() method did. Even assuming no errors were produced inside
of the function, things didn't get connected correctly somehow.

## Other JS / Angular stuff

Today I was trying to dust off the CodeCademy course on AngularJS.
There was one thing that frustrated to extensively. I couldn't copy the files
and test them by just running my browser. It turned out that I was just
missing the invocation of the `app.js` code which defined the module, as
well as the controller. These needed to be called directly in the `index.html`,
which is obviously the page that a visitor lands on.

So I understood the concepts, but not the logic behind linking them all.

I guess that's kind of part of the problem with online learning in the first
place. Giving students rails to drive on keeps them from going off the
rails and learning more on their own. In this case, giving a very well-designed
directory structure wasn't bad per-se. For me, the problem was the
directory structure was combined with a host of other irrelevant distractions
in the code. If you don't start off with just what's important, you never
know what's necessary to do a new project.

[lj]: https://github.com/leigh-johnson/leigh-johnson.github.io/blob/source/_includes/post-footer.html

