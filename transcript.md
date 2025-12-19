Welcome to Syntax. Today, we're talking about remote functions in RPC
in Svelte. I'm gonna say off the bat, this is the solution for RPC,
for data loading, for anything. I don't wanna use anything else on any
other platform, and we're gonna show you why. If I'm using React, it
better look like this.

So we're gonna be breaking down what these things are, just the
general approach for data loading, how it kind of takes the server
client side of it all and makes it really nice and palatable while
keeping a nice separation still. My name is Scott Tolinsky. I'm a
developer from Denver, and with me as always is Wes Boss. What's up,
Wes? Hey.

Excited to talk about this because I dove into several of these, like,
RPC libraries in the last couple weeks, you know, and it turns out
BetterOff has one called BetterCall. Hanno has one. Eliza has one.
Cloudflare has one that's called cap cap and web or something like
that. Like, it's Cap'n Crunch.

And, like, there are a lot of the like, this idea of like, obviously,
we've we've talked about tRPC. We had them on the podcast as well in
the past, but there's so many different implementations of this RPC,
and I'm excited to see what Svelte's take on it is. Yeah. This is
something that I think we've both personally felt. The Syntax site is
built with SvelteKit.

It uses the load functions for data. And I think one of the things
that always felt odd about that was, like, all of your data, all of
your your refreshing, your invalidation, even your form actions, they
all kind of live at that root of the route level. Like, on any given
route, it exists on a page level. And, like, in a componentized world,
that just felt weird. Right?

Sometimes you were defining actions on a route and then having to call
them or refresh more data than you'd want or reinvalidate a load
function. So I was really excited when they announced this at, Svelte
Summit, and I've been doing quite a bit with this, like, really quite
a bit. In fact, Wes, you might be interested to know, I've been doing
going nuts on the the new syntax website. So we've been working on a
new syntax website. Yeah.

Man, you're motoring. I'm motoring, and it is, like, I I ripped out
our ORM, so we're using Drizzle now. I changed from MySQL to Postgres.
I rewrote all of the data loading in Svelte remote functions. I have
done a shocking amount of things in the and Courtney was like, is this
does this stress you out?

Like, do do you regret making these big choices? And I said, no. I I
love this. This is what I love. Love being here.

Name is Rewrite Talinski. Did you know that? I love taking everything
out of the cabinet and putting it all on the countertop, and then like
Yeah. Meticulously putting it back in and maybe three d print some
boxes or something and that's what I'm doing right now. I just like
pushing the stuff to the back of the like, lived in our house for like
three years now and I like got on up on a stool.

We have this really deep cabinet And I was finding like hot sauce from
like three or four years ago. Was like, I should probably do a
Tolinsky on this right now. I love taking it all out. And then in the
web dev is is absolutely the same. But you know, at this point, we I
needed to, like, rework the entire data structure of the website
anyway.

So it was like Yeah. If I'm already reworking the entire schema and
how the data is connected, and, like, I might as well do it in
technologies I actually like if it's easy enough to just migrate it.
Yeah. Which it has been. Yeah.

So, it's been a it's been a trip, but let's talk about remote
functions because I've been using these things like crazy. Basically,
as of today, when we're recording this, this may change soonish. To
get these things going, you do need to tick two different experimental
options in a Svelte config, remote functions true, and async troop. So
these APIs are used in combination. The async Svelte where you can
just throw a wait tags in your Svelte components and just do that, and
it just all works.

Remote functions, though. Remote functions exist where you have a
special file name. It's something dot remote dot t s or j s. These can
live straight up anywhere. And a dot remote file name is great because
that lets you know off the jump, this is taking place on the server.

You don't have to worry about client server. Where's this code
running? Am I importing something, like a database or something
insecure in this? You know that it's a dot remote. It's a server based
file.

So that's really great. Right? And then from within a normal Svelte
component, you can just straight up import that query mutation,
whatever. We'll talk about those in a second. But you can just
straight up import those as a function and call that function in your
code.

So if you want to let's talk about the, like, the first one of these,
which is, like, querying data. In a dot remote function, you have a
query. It's essentially like a query function that takes in another
function as a parameter or like a schema that you can then use to
validate your data. Either way, you have a function. That function can
do database calls, returns data.

In the client side, you're just calling that function. Bingo. Your
data's there. You don't have to worry about routes. You don't have to
worry about paths.

You don't have to worry about anything. It's like, I'm calling this
function, and it's gonna go grab me my data. And it's very most
simple. You could have a query function that just returns Scott, and
then the client, you could say, get Scott Yeah. And then it just gives
you Scott.

So, like, let let me maybe explain to the listener if they're like,
like, what's what's the benefit of that? So typically, when you have,
like, a website, right, you have, like, a back end, you have a front
end, and then you need some way to communicate between those two.
Right? And you might make, like, a like, API where you can, like,
fetch endpoints. You might make, like, an open a open API schema so
that you can you can share types from the back end to the front end.

But with a lot of these, like RPC, React server components, Svelte
remote functions, The way that it works is you simply just import the
function from your server JavaScript and run it in your client
JavaScript. And then there is a little bit of magic that happens
between those two where you're not actually importing the client side
code into your or sorry, the the server code into your client. You're
you're simply just importing something that will interface over the
network if you're calling that from client to the server. Or if it's
server rendered, it's just gonna run it all on the server. Is that a
fair description of it?

A perfectly fair description of it. Now when this gets really powerful
is combining with the fact that you can just await anywhere inside of
Svelte components. So you could just even inside of other loop, you
could do, like, an each await, get Scott, and then as the whatever.
And the next thing you know, your data's just there. Or at the top
level of a component, you can await in the top level of component and
get that data there as well and utilize it just like you typically
would.

And you don't even have to await it either. You can just run the
query, and then you could also have a query dot error, query dot
loading, or query dot current, which then gets you access to the data
when it's available. But if you want like server side rendering and
stuff, await it and it just works. And if you want to see all of the
errors in your application, you'll want to check out Sentry at
sentry.io/syntax. You don't want a production application out there
that, well, you have no visibility into in case something is blowing
up and you might not even know it.

So head on over to sentry.io/syntax. Again, we've been using this tool
for a long time, and it totally rules. Alright. This is I I wouldn't
say one place, but this is another spot that Svelte has an up on React
because asynchronous components do not exist in the client side React.
They do exist on server side React, and they have said that they're
coming to client side React.

But if you want to simply await some data and then return the
component, you can't do that on the client side, right? You have to
have a user factor, have to use 10 stack query, something like that,
and you have to show a loading state. And that's a pain in the butt,
because in many cases, you simply want to just return nothing And
while it is I think also this goes in hand in hand with the
asynchronous component stuff, where I think the reason why Svelte and
a lot of these places did not initially offer the ability to do
fetching at a component level was because you get this, like,
waterfall problem where, like, you can if you can fetch anywhere down
the tree, then you can cause these waterfalls that can cause your
render to be very, very slow. So React suspense, Svelte async
components, it solves that by allowing you to find how long and what
you should actually wait for if you're server rendering, and then what
you should simply just send to the client and then let it load at a
later point. Yeah.

There's a cool query dot batch in here too, which I'll show you. So
you can basically just await that data and and get it. You know, this
is really great because I found this to be super clean. I found it to
be way nicer than having data in the load function. That load function
then passes to props.

You're kinda hot potato ing this. This is more like you have your
function call already. You call that. You get your data. You output
it.

You can await it. You can also with async Svelte, you can await inside
of derived too. So if you want to have something reactive coming in
from the server, you can just toss in an await git Scott inside a
derived. That's super nice. So that's great.

You can also pass an argument, so these things are functions. You can
pass an arguments. One really neat thing that they've done with all of
the remote function stuff is that they've really leaned on standard
schema. If you wanna learn more about standard schema, we did a whole
video on it. But, basically, because it it uses standard schema, that
means that you can use any validation library out there to validate
your inputs.

So whether that's Zod, Valibot, archetype, like, whatever you wanna
use that uses standard schema, you can do so. And inside of your
query, if you want the if you wanna accept arguments here, the first
parameter is just that validation. So in all of their docs, they use
Valibot, which is really great, actually. I've been using Valibot.
It's really nice.

But if you could say, like, the query, the first parameter is a v dot
string, then you know that, that requires a string. And then, of
course, you get all of your TypeScript type checking. You get
everything, like, really nice. I think that's one of the things that
as you'll see throughout this episode is that the type checking story
for all of this is so effortlessly good, and I think a large part of
that comes down to their usage of standard schema where you're not
having to import types or whatever and everything just kind of,
whether it is client or server side, you have that type checking story
the entire way, and it's really nice. Through.

Yeah. Man, the the standard schema guys, like the Zod and Archetype
and Valid bot, they, like, all worked on that. And, like That's
awesome. Since we did the episode on that, I've seen it implemented in
so many places, and it's become so much more important from, like, an
AI perspective because you can get a quickly get a schema of what your
data actually looks like. But then, like, when I run into stuff that
doesn't use standard schema, like, the Chrome Chrome has, like, a beta
right now for AI in the browser.

Mhmm. And they use JSON schema. Yeah. And it sucks because, like, I
have to now I'm like, I just wanna write it in I wanna write it in Zod
or whatever. Like Or whatever.

For those who who don't know, standard schema is this way that you can
write your schema in Zod, Valid bot, archetype, effect, whatever, and
then it will con there's a method on that will just convert it to a
standard schema. And then you can also many tools will also just
consume a standard schema and convert it to to whatever they need
internally. And when a tool doesn't support standard schema, that's a
pain in the butt now. Yeah. Because now you gotta just use that tool.

Where here, it's like, I can pick my own from all I I just pulled up a
list of all the different ones, and there's so many. Effects schema,
typemap, form data. I haven't even heard of most of these. Joy, have
heard of that. Yep.

Have heard of that. So there's a whole bunch, and and it's great that
they are all kind of landing on standard schema. And even better that
something like this would be like, you know what? Let's embrace that.
And, because of that, you can use whatever you want, which I love.

There's also the ability to refresh your queries, like, manually. If
you want to refresh your queries at any given point, you just take the
query, and then you call a dot refresh method on it, and it will
retrigger that as a function. So that's nice. There's also query dot
batch, which allows you to batch queries that happen within the same
microtask. This is like in their example, they basically had a list of
cities, and then they had a query that was, like, get weather from
that city.

And the query was taking place inside of an each loop in the
component. So inside of an each loop, the city had a a wait get
weather passing the city that's being passed in from the loop. And so
if you were to do this without the batching, you could imagine each
loop is going to be a call. Right? A remote call.

And that's not great. So if you use query dot batch, it's going to
batch all of them from the same task, and therefore, it's going to not
make a bunch of trips. Basically, it calls them all instead of having
multiple Okay. Calls. Yes.

So the benefit here is that, like, instead of sending off 10 requests
for 10 cities, it sends an array of 10 requests once, and then those
10 things are executed on the server. And I guess you could have logic
on your server to to do them all at once, or you can just fire them
all off at once, and then it sends all the responses back at once. So
that helps both with network, but also I'm assuming it helps with
rendering as well because then you're not getting 10 render updates as
they they come in. You simply just get one one render once it's all
done. Yes.

And in this particular example, they're able because it's in that
loop, they're doing query dot batch. Like you said, they're getting
all of the cities as an array, and it's one database call even instead
of Okay. Not just one exactly API call. What I was looking call. Yes.

Which is great. That's nice. And there's no fussing with, like,
promise.all or anything like that. It simply just sticks them all in.
Yes.

For this for this use case, this this rocks. Now let's talk about the
I think this to me is the the killer feature of this all because a lot
of RPC systems have, like, a query system. You call the function. You
get the data. Right?

There's another type of remote function called a form function, and
the form function is the goat. This thing is awesome. So what's so
cool about this is it's used for doing mutations, but not just general
mutations. It's useful for doing mutations that take place on an HTML
form. What this gets you is you're basically defining a form function
using your standard schema stuff.

You're passing in the inputs as the first parameter. The second
parameter is an async function that does the work. But what's so
awesome about this is not the server side stuff, because the server
side thing functions exactly like you expect. Data comes in, you do
the work, you return your stuff. But on the client side, the form
function has a ton of stuff.

So you spread the remote function onto a form, and then you get a
progressively enhanced HTML form that works with or without
JavaScript. You can spread out individual fields, and then you get
individual field validation. So you write your standard schema on the
server side that is then used to validate both the input into the
function as well as the HTML input itself. Wait. So it does like, it
will render out the client side HTML and the JavaScript that is
necessary for it to client side validate?

Yes. Oh, that this is almost getting like like like a rails. It's
sick. It this is sick because not only do you get that. Right?

So, like, the the the way you're spreading it out, you're spreading,
like, let's say it's a create post. You're spreading create post dot
fields dot title as text on a normal input tag. That then sets the
input tag to type of text. It sets the ID. It sets all of the stuff
that you would need to have a valid working form input.

And that rules, man. I I'll tell you what. I I I, was working on a
blog, and I use this in like, I'm doing a tutorial course on, which is
it's gonna be out by the time you are watching this. So, check it out
on Syntax if you wanna learn how to do this. But, like, man, to be
able to build this, wrapping a label around an input and just saying
here, use that.

Oh, it's read only. Like, man, this kicked ass. And I really, really
liked working in this this way. But it it gets even better than that
because not only do you get those things, man, you get so you get the
validation component and stuff like that, but you can also get error
messages. You can get sorry.

There I'm I'm scrolling through the dots. You here? Couple episodes
ago, you were fighting me and saying, I was I was showing you some
form library that, like Yeah. That did this. Yes.

And you're like, I don't need that. I could just do that with the
Svelte store and a couple lines of code. Yeah. Now That's what I'm
doing. You're here, you're gushing over the exactly this.

No. This is this is the platform. Mind you, this existed when we it's
fine. This existed when we recorded that episode. This is less code
than that was too.

I'll tell you that. My point was is that if I want not that I don't
want a form library. It's that if I have a form library, I want it to
do more for me. I don't want it to write all of the inputs. I don't
wanna have to write the update stuff.

I don't wanna have to write any of that stuff because at some point,
it's like, what is the library doing for me? I want the library or in
this case, the platform to do more for the forms. Yeah. Wanna I wanna
pass it in the giant object. Schema to HTML inputs, validation, all of
that stuff.

And Yes. I think that's that's what that library did. I can't recall
the name of it right now, but I agree with you because I am done
writing crud forms where we simply Done. Take data. Am done.

Yeah. And and, like, I do wanna push back on that because I I I agree.
Like, I do think form libraries are really nice. I've built my own so
many times, but I want the form library to do more. If I'm having to
write out every little bit detail.

Yeah. Yes. Then then at that point, like, what that library did, I
didn't see a benefit of it. Like, yes, it handled validation in those
types of states, but you still had to write most of that code
yourself. And a lot of that was because of how you work in forms and
React in general.

So that that's my point. Also, gives you client server, gives you the
whole whole bingo bango. Gives you everything here. There's also you
can do programmatic validation with it easily enough. If something
becomes invalid, you can get the error message directly from here
without having to write any of that.

You don't have to have controlled inputs or anything like that. The
state just kind of lives as a part of this remote function. Mhmm. So
you don't have a controlled form. You don't have to deal with form
data on yourself.

You're you're just writing an HTML form that works in JavaScript or
without JavaScript, and you get access to things like the individual
error messages if something becomes invalidated. It's pretty sick.
That's great. I I could see myself building even, like, a even higher
level rapper on this. I'm already doing that.

Yes. At a very high level, just took all my inputs, figured out what
kind of input they needed to be. You know, is it text area? Is it a
number? Is it a date?

Etcetera. I love doing that. I'm already doing that. Yes. Huge huge
fan of that.

Yeah. It it's really neat. And it like, obviously, if you want to step
in and there's this whole progressive enhancement story, if you wanna
step in and do more with JavaScript in here, you can do a dot enhance
on here and get access to the entire process. So let's say you wanna
throw a toast message after you submit it or you want to handle errors
your own way or you just wanna step in there Yeah. You can hook in.

You can call await submit. You can call a form dot reset if you want
to. You can you can step in there. Same as if you need to do something
custom on, like, key up or something Yes. You could you could
overwrite the default one.

Totally. You can also get in here and do you can update the state
programmatically of the form. Keep in mind, again, these aren't, like,
controlled forms in that way, but you can get on here in an individual
field by referencing mutation dot fields dot the field name, so dot
title dot set, and you can programmatically update that. And you can
grab the value at any point with fields dot value and get access to
that value live. So it ends up becoming a controlled input, but you
didn't write one line of state.

You didn't write a state updater. That state just lives with the form,
and it all it's it's just so cool. Love all of that. When you're done
with these, you can update your data. So there is the dot refresh
method that we called before.

If you run dot refresh, it is just running that query again. But
there's also a dot set method too on that. So let's say your mutation
returns the new data, right, like you did an update, and that mutation
actually returned the new data, you wouldn't have to then call a
refresh and have it do another database query. You could use this dot
set to take that new data and just insert it as the result into that
query and pass that along, avoiding an extra database call. They
really thought of, like, everything here.

That's great. Even optimistic UI you can do with this. So it's pretty
sick. Form is GoDed. It's it's awesome.

There's so much here. There's also a command query, so this lives in a
remote function. This is basically just a mutation, function that you
would exist where you're not using an HTML form. But the form one
makes it so easy. It's like, we should really be using forms for so
much more.

Right? Like, just wrap up a form in a button. Yeah. So everything
should be like, there's the best way to transport data from the client
to the server is with form data. Right?

Like, form data is the best. You can have multiples of the same type.
You can have images in there. You can have multipart. It's just like
all the remix stuff is all built on form data as well.

It's just one of those standards where everything going forward should
be built on form data, and and an added benefit is that you can simply
use HTML forms if you want. Yes. And also, like, in in addition to
that, something we do a lot on the syntax site, URL as the state using
query parameters. State in query parameters on the URL. Yes.

It's shareable. It it's very nice. I think those two things are
totally underrated. Forms, query parameters. The last one here is
prerender.

Prerender is basically query, but it's something that only runs on
build time. So if you're doing static sites, you only wanted this to
ever run on build, you have the option to have the prerender. So
that's it. You have query, query batch, form, command, and prerender.
Those are the different remote functions.

They all kind of have a specific use case. And, man, I've been I've
been ripping on this stuff, especially on the new syntax site, just
like whether or not it is just throwing a database query in here or
there or whatever or Yeah. Changing our remote functions. I I've just
been really, really as I get through with this, I'm writing less code.
I'm getting better validation.

The TypeScript stuff is so nice. I'm not having to import types and
anything like that. All type safe across the board. It rules. Very big
fan of this.

So that that's pretty much it. Do you have any anything there? I do
have one last question. Is there anything related to caching Yes. In
all of this?

Yeah. So, caching, especially, like, you would it would still happen
at, like, if you're especially if you're doing server side rendering.
Right? That's still happening at the, like, the page boundary. Right?

If you're caching that, it's still happening at the page boundary. I
think there's gonna be more with the caching of the data. There's some
caching stuff with the prerender queries using the cache API. But
Yeah. In general, on these functions, you're not setting cache
headers.

So this is something that only Next. Js, I think, has nailed. Yeah.
And it's the ability to do a component level cache. And a lot of
people don't understand.

So let give you an On my website, westboss.com, I have the syntax,
latest syntax podcast in the footer, and that is a syntax component in
the footer of my website. And that does a fetch to the syntax API and
then brings it back. And there's a problem where and I have a couple
other things in the footer of every page. Right? And I can I cache the
data there?

Right? But I kinda wanna just cache the entire component Yeah. As it's
being rendered. And there's nobody, except for Next. Js, that has the
ability to to cache a component level.

Everybody's caching entire pages Mhmm. Which is sometimes okay, but,
like but what I end up with sometimes is that, like, if I cache an
entire page, then the the footer data is sometimes different from page
to page because they've been cached at different points. Yeah. Yeah.
So the other the other option is you can simply just cache the
expensive stuff, which is the data fetching and then just rerender
every single time or set like a really short rerender on it.

But I'm I'm curious to see, and I bet Svelte will roll out something
like this as well, where you'll be able to just, like, cache this
entire component for however long, and then do the whole stale wall
route of validate headers on it, and that would be sick. Because then
you can reuse that component anywhere else on your dynamic site, but
you don't have to spend the overhead of rerendering that sucker and
and doing data fetching. Well, let me tell you, Wes. I also felt this
pain. I felt this pain, and that's why I took it upon myself to make
something, which I so I wrote and I'll I'll show I'll share this with
everybody.

And this is I'll I'll say this. It's naive. It's a quick
implementation, but it works really well. What this is is a service
worker because service workers are built into SvelteKit. It's a
service worker that basically does stale wall revalidate using
IndexedDB.

So it takes any right now, it's just queries. It takes any remote
function query because I can identify those. It takes any remote
function query and saves it to IndexedDB. On the next page load, if
it's being done on the client side, it's gonna check IndexedDB and
just load that data. So it's basically like a local IndexedDB cache
that Yeah.

I don't even have to do anything in my code because it's a service
worker. It's just there. It it worked really well. I, like, wrote
this, and, like, I'm not good, with service workers. And I I it's a
pretty small implementation, a 150 lines.

I do need version numbering needed. I I chatted with CJ about this
yesterday. But, man, it works really stinking good, man. You're doing,
like, massive amounts of pay data loading within, you know, ten
milliseconds because it's just there. It is like it's like the not
local first, but it's the local data cache lessons I learned from
using something like Xero just tossed into an automatic service
worker.

That's great. Yeah. I was pretty stoked about this working well.
Similar to what I did on my side as well, but I did this on the
server. So I stuck everything in, like, a key value store, and then I
as part of my data fetching strategy, I just first checked if it was
there.

But that doesn't help the fact that the the actual component itself
has to rerender in the Oh, sure. Yeah. Yeah. If you want like, if you
wanna, like, server render and cache an entire page and then go from
page to page, then you're you're in trouble. That's a hard problem.

I don't envy anyone that has to work on this caching stuff because
it's it's a can of worms and it's edge cases all the way down. It
kinda sucks to have to Cache and DNS and what are all the things?
Yeah. Those are Cache ruins everything around. We gotta make that
shirt.

I have a rule, no funny shirts. But, man, that would be a good funny
shirt. Yes. I think Wu Tang is for the children, so I think I think it
qualifies. Beautiful.

Well, I'm excited to see all of this implemented in the new syntax
site because this was one of the biggest qualms I had with Svelte, and
they have done a fantastic job at solving that. Yeah. Yeah. I I I it's
one of those ones that after it was announced, I I I had so much on my
plate that I didn't dive into it. And since diving into it, just a
big, big fan of this implementation.

I'm not I'll I'll say this. I'm not saying no other RPC systems have
have done it as good as this, but it better be as good as this if if
you want me to use it. Because now I've I've been the edge and back,
and I I'm very, very, steady. Yeah. Yeah.

Don't I don't think you'll get better than this, because it's like
it's tip to tail. Right? SvelteKit has control over absolutely
everything. For something where you just need to add RPC into an
existing solution, that's where you probably would reach for one of
these individual one. But man, is it nice having a meta framework
where it just is is tip to tail?

Yes. Snout to snout to hoof? Snout to hoof. That's not that far of a
distance if you think about it. No.

No. Cool. Do you wanna get into sick picks and shameless plugs? Yes.
Alright.

I'm a sick pick my dishwasher. I talked about it in the last couple
episodes. I'm very happy with it, but I've we've had it for, like,
almost a month now. And we got the Bosch 800 series dishwasher, and
this thing is amazing. Got the third row for I don't understand how
they they have more room in a dishwasher when it fits into the same
physical one, like the 24 inch thing in your in your kitchen, but this
thing is awesome.

So if you're looking for a new dishwasher and you're tired of fussing
with them, you know, like, have we have a house. We have a cottage. We
had our our old house. Like, I have fixed enough dishwashers in my day
Mhmm. That I know do not buy the $500 LG.

LG does make good ones. They're they're a higher up there, but, man,
it's it's a nice life improvement if you can get a nice dishwasher. So
our old one lasted for twenty one years. And when we it out, we're
like, yeah. We'll just buy another one of those.

So sick pick. Nice. I'm gonna sick pick my new cold brew setup. Man,
I've been I've been making my own cold brew for a while. And when you
make cold brew, like, there's a number of things that can go wrong.

It can get really, bitter really quick and can get really, like, burnt
tasting. And I, like, went deep on, like, what am I doing wrong?
Because I was just kind of suffering through mediocre coffee when I
like, it's like I I drink good cold brew other places. I know it's
possible. Like, why can't I dial this in?

So I dialed it in. I am now measuring my beans. I'm doing seven ounces
of of beans per coffee sock. So the sick pick one part is going to be
a coffee sock. It's basically just like a a cotton sock that you put
the beans in, and I do that in a this is a 64 ounce mason jar.

You can buy a kit that comes I'll I'll have a link to this. Yeah. You
can buy a kit that comes with the mason jar and the coffee sock. Now
the key to this all is you brew it either in the fridge or on the
counter for, like, twenty four hours. Right?

You do this this six to eight ounces. You you put it in the coffee
sock. You fill it with water. But the key ends up being a double
filter. So after you're done with that, I then have another glass
thing, and then I I pour through one of those Chemex filters.

I don't have, like, a fancy setup, but the the Chemex filters are
these paper filters. And you double filter it through the paper
filter, and then I do that into, like, a giant glass pitcher. And,
man, it tastes like Starbucks cold brew. It tastes like the stuff that
I buy in the store. It is perfect.

Wow. It solves every issue that I've ever had with cold brew. The the
two things that are important is, like, the double filtering is a
massive one, and then the amount of time that I'm brewing plus the
amount of beans. But let me tell you, it's been really great, and and
now it's it's so much more economic. We we have, like, economic
economical.

I don't know what those either way, we buy a big old thing of beans
from Costco. You ground them up. You put them in the thing overnight,
And then, a big thing that was important to me was that it had to be
all glass on glass the whole process because so many of the options
out there are, like, plastic filters or plastic brewing systems.
There's one cold brew, like, system that's like a a countertop machine
that is really just concentrated cold brew pods that it's mixing with
water. It's like, what's the point of that?

Who's buying that? They're expensive too. It's like, what's the point?
So yeah. Man, we I I for the longest time, I wanted an espresso, and I
finally I finally got one.

Yes. Those things suck. So, like, it's the yeah. Like, it it brews
okay coffee, but, like, it's, like, like, $4 a pod Yeah. And you gotta
buy the special ones, and there's DRM in it, and, like, no thanks.

Yes. You know? Like, beans are not that expensive. And if you can just
figure out how not to be an idiot and do a little bit of research like
Scott just did, you can make some wicked coffee at home without being,
like, an obnoxious coffee person. Big old bag of beans.

Doesn't matter what because cold brew especially doesn't matter.
Normal beans, it like but yeah. I'll I'll get whatever is on sale at
Costco that's decent. Crunch it up, and then I I do $2.64 ounce ones
because we consume a lot. And then I put it into a big glass thing,
and it's glass on glass on glass the entire way down.

Glass, cotton, paper. That's it. So Beautiful. Alright. Thanks, for
tuning in.

We'll catch you later. Peace.
