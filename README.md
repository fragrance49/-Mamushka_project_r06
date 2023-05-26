# Mamushka
an interface floating display system. 
that can be displayed on existing web pages (hosting page)
and activate another page url upon click on its elements.

app is Capable of getting a JSON display definition file, 
draw interface on screen (in a given location & size)
when open issues a request to my server for suitable JSON (sending current hosting url as parameter)
and draw itself on page acording to the returned JSON

app will hold elemnt defintion to draw on site, each element will have
- size & position data
- graphic & audio data (looks & effect)
- on click a URL to jump to (+ app reserved words parameters etc )

app will "keep" log of user actions and report it back to server.


# elements
the interface can display
- button
- text
- hotSpot

# JSON
Interface description will come in form of a JSON file

# App Reserved words
- ^# - the default image folder
- ^@ - the user/interface current unique id
- ^E - the current element ID
- ^P - the current Page ID
- ^M - default Mamushka server url
- ^R - previous page url
- ^C – current page json ID
- ^R – previous mamushka running url.
- ^N – next mamushka running url.
- ^A – Page answer set answer number
- ^O – Current object id (object that this value is inside it)

reserved words can be embeeded in url or text, when app will read a string with reserved word (^..) it will replace it
with the relevant text,

for example if ^M = "www.myq.re/mamushka" and in definition json key "pressURL" value = "^M/answer.php?id=3453" 

then app will refer "pressURL" value as "www.myq.re/mamushka/answer.php?id=3453".


The interface code will be kept on a webserver mydomain.com/interface/code
In hosted web page we will add a <DIV> to page code and have a style.css located localy in hosting webpage

  The program will be built based on [DynamicButtonSample](https://github.com/shaykid/DynamicButtonSample) project
  this Sample project is hard coded built for interface of N rating buttons only
  The idea is to take the Sample app, and disasmble it to elements and rebuild "Object Oriented way" it, so we can applay more types of elements
  so it will support other types of elements like
  - Push button           (this already app knows how to do)
  - Text label display    (this already app knows how to do)
  - Animated gif display  (this already app knows how to do)
  - HotSpot area.
  - 
  
# URL Parameter types
  
JID – JSON file id to retrieve. 		Www.mamushka.com/?JID=”skdXS2!”
	Mamushka will request ^M/JSONS/JID=”skdXS2! And get back the JSON file.
	We will add ^C as reserved word of current JID.
  
JPM -	JSON param change.
	Mamushka will “refresh itself” with the new param adjusting 
	its current JSON data it holds acording to this param.
	Param will hold “rootKey”."InnerKey".”Value” , in this way we can adjust 	the 2 level json we currently using. (maybe be ready to future 3 level JSON ?)
			Www.mamushka.com/ ?JID=”skdXS2!”& JPM ="design.bodyBckgImages.	[^M/Background1.gif, ^M/BackGroundNew45.gif]”
This will change the background of the app to new values.
  
PRL – The previous page JSON ID.  (used in  "pressURL")
Can also be included in JSON under ^R

 "pressURL": "^U?PRL=^C&JID=^N&ANS=^A"
This means it opens mamushka again, with the new page JSON Id (^C) and the last answer chosen.
  
ANS – The answer value selected in prev JSON.
  
  
# First implimentation
  we will develop a Trivia interface, displaying Question + 4 Image based answers to select from.
  This will be used as a sandbox to test the developed code and elements activety.
  
  
  
  
  
