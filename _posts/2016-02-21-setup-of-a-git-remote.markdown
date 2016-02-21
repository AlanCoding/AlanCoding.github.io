---
layout: post
title:  "Process of setting up a git remote server"
date:   2016-02-21 22:00:00 -0500
categories: raspberry git server practice
---

Source control is all over the place these days, with git becoming a primary 
tool, not just for managing development, but for moving code from place to 
place.

For a simple example of pushing code from place to place, what better place 
to start than with this Jekyll site, which I'm using to write about the 
process in the first place?

First, we have to get started with the installs to use Jekyll on the remote 
machine. I'm borrowing from [other sources][jkl-instructions] here, but note 
that the -V at the 
end helps to let you know that the install is doing work and not just frozen.
For me, this is going on a Debian distribution.

{% highlight bash %}
sudo apt-get install ruby ruby-dev make gcc nodejs
sudo gem install jekyll --no-rdoc --no-ri -V
{% endhighlight %}

Now github offers a fairly easy way to bootstrap our repo. The .git for this 
very Jekyll repo is just [at the github repo][repo]. To do all this, I am 
trying to loosely follow the instructions from [git-scm.com][git-scm], but 
with the exception that all the basic certs have already been set up.
Given all this, I clone the git repo on the server, and then add the 
remote on my own machine. You'll have to mentally substitute in the specific 
usernames and addresses.

{% highlight bash %}
git remote add my_server username@server_ip_address:/opt/git/AlanCoding.github.io
{% endhighlight %}

So here I go, I'm going to make one commit, push it directly to this server, 
then after that I'll make another commit and push this to github.

...

Well, that didn't quite go off without any problems. It turned out there was 
a reason that tutorial started off with a bare repository. I opted to just set 
the config variable:

{% highlight bash %}
git config receive.denyCurrentBranch ignore
{% endhighlight %}

After that, and a "push my_server master", it accepts the push. Then ssh in,
and "git log", and we have the last commit I just made.


[repo]: https://github.com/AlanCoding/AlanCoding.github.io.git
[git-scm]: https://git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server
[jkl-instructions]: http://michaelchelen.net/81fa/install-jekyll-2-ubuntu-14-04/

