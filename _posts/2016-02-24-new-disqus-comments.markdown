---
layout: post
comments: true
title:  "Comments Now Available?!!!1"
date:   2015-02-24 17:00:00 -0500
categories: jekyll comments update
---
I think I have enabled Disqus comments for this blog with my recent commit.
We will see in this very post.

This has actually been a helpful exercise for me to learn more about the 
free-form usability of Jekyll. Most people implement these as a block in the 
\_includes folder. I said "meh, no" and I have them in the post.html layout.
So far, I'm turning the comments setting to true on a page-by-page basis.
But this wasn't strictly necessary either. I could have a layout that 
everything inherited from and add the comment field there.

Well, that brings up another good question, how is Disqus going to know what 
pages should be granted a comment box? Maybe they will create a new comment 
thread whenever it gets any traffic that seems to indicate the user came 
via that webpage. That system seems extremely prone to abuse. But I don't know,
maybe I haven't understood it yet? We'll see after this post.

First attempt: did not work. Will try a little hacking.
Here are some different variable attempts, we will see if any contain
the comments variable.

 - post.comments: {{ post.comments }}
 - page.comments: {{ page.comments }}
 - comments: {{ comments }}
