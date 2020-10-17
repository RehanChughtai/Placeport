/*
 * UP837518
 */

'use strict';

const express = require('express');
const imager = require('./imager');
const url = require("url");
const app = express();

app.use(express.static(__dirname + '/public'));

// min and max image width and height
const MIN=0;
const MAX=2000;
// lists constructor in Records(Recs)
function Recs()
{
this.recentPath=[]
this.recentSizes=[]
this.recentText=[]
this.sizeOfTop=[]
this.topRefs=[]
this.hits=[]
}
// log msg/err into shell
function log(msg,err)
{
if(err) console.error(msg,err)
  else console.log(msg);
}

let recs = new Recs();

//Listen express server to port 8000, else provides error message.
app.listen(8080,(er) =>{
  if(er) log('Error happen on running server',er)
  else log('Server start at Port:8080');
  });

// get dimensions from request
function get_dimensions(req)
{
return {width:req.params.width,
    height:req.params.height}
}

//Check Minimum Height & Width
function check_min_dim(width,height)
{
if (width <= MIN || height <= MIN)
{
  return true;
}
return false;
}
//Check Maximum Height & Width
function check_max_dim(width,height)
{
if (width > MAX || height > MAX)
{
  return true;
}
return false;
}

//return http 400 bad  response
function res_400(res)
{
res.status(400)
    res.send();
    return;
}
//return 403 permission denied response
function res_403(res)
{
res.status(403)
    res.send();
    return;
}
// update json count on each hists
function updateHits(curDate,t_json)
{
    recs.hits.forEach((hit, i) =>{
        if (hit > curDate - 5000) {
            t_json[0].count += 1
        }
        if (hit > curDate - 10000) {
            t_json[1].count += 1
        }
        if (hit > curDate - 15000) {
            t_json[2].count += 1
        }
    });
}
// Url constructor
function CURL(req,width,height)
{
this.pURL = url.parse(req.url, true);
this.encURL = [];
this.encURL.push(this.pURL.pathname);
this.queriesToAdd=parseTempQueries(req, this.pURL);
this.encURL.push(this.queriesToAdd);
this.encoded = this.encURL.join("");
this.statStrg = {
            w: width,
            h: height,
            n: 1
        }
}
// add state to top list if not in
function updatesizeOfTop(curl,width,height)
{
let inlst = false;
        recs.sizeOfTop.forEach( (value, i)=>  {
            if (value.w == width && value.h == height) {
                value.n += 1;
                inlst = true;
            }
        });
        if (!inlst) {

            recs.sizeOfTop.push(curl.statStrg)
        }
}
// add referer to list if not in
function updateTopRefs(referer)
{

                let inlst = false;
                recs.topRefs.forEach((value, x) =>  {
                    if (value.ref == referer) {
                        value.n += 1;
                        inlst = true;
                    }
                });
                if (!inlst) {
                    let refCount = {
                        ref: referer,
                        n: 1
                    }
                    recs.topRefs.push(refCount)
                }
}
// handle image
app.get('/img/:width/:height', async function (req, res) {
  let {width,height}=get_dimensions(req)
  let square = req.query.square;
  let text = req.query.text;

  if (check_min_dim(width, height))
   {
       return res_400(res);
  }
  if (check_max_dim(width, height))
  {
        return res_403(res);
    }

  //Check for invalid dimensions
    if (height == NaN || width == NaN || width % 1 !== 0 || height % 1 !== 0 )
  {
       return res_400(res);
    }
    width = parseInt(width);
    height = parseInt(height);
//Checking Square is a Number greater than 0
    if (square <= "0")
   {
        return res_400(res);
    }

//Checking Minimum Square Size
    if (square % 1 == 0)
  {
        square = parseInt(square);
    }

  //Checking Square Size is a number or not when inputted
  else {
        if (square !== undefined)
    {
            return res_400(res);
        }
    }

  //Analyzing URL and Requesting URL
    let curl=new CURL(req,width,height);
    addedData(curl.encoded)

//Holds a record of the height and width in a empty array using records for
//size of Top
  if (recs.sizeOfTop.length == 0) {

        recs.sizeOfTop.push(curl.statStrg)
    } else {
        updatesizeOfTop(curl,width,height);
    }

    let referer = req.get("Referrer")

        if (referer !== undefined) {
            if (recs.topRefs.length == 0) {
                let refCount = {
                    ref: referer,
                    n: 1
                }
                recs.topRefs.push(refCount)
            } else {
                updateTopRefs(referer);
            }
        }

        recs.hits.push(Date.now())

  //Functions called to return recentSize and recentText
  addRecordLastSize(width,height)
  addRecordrecentText(curl.pURL)

  imager.sendImage(res, width, height, square, text)
  })

  app.get("/stats/paths/recent", function (req, res) {
    let reveresedLists = recs.recentPath
    res.send(reveresedLists.reverse())
    reveresedLists.reverse()
    return
})

//Gets array to be sorted  by slicing between 0 and 10.
  app.get("/stats/sizes/top", function (req, res) {
      let arrUnsorted = recs.sizeOfTop.sort(sortedProperty("n"))
      res.send(arrUnsorted.reverse().slice(0, 10))
      return;
  })

  let sortedProperty = function (entity){
    return function(a,b){
        if(a[entity]>b[entity]){
            return 1;
        }
        if(a[entity]<b[entity]){
            return -1;
        }
        return 0;
    };
};
//Replaced all undefined square and texts as temporary parsed url queries.
function parseTempQueries(req, parseURL){
    let tempQuery;
    if(req.query.square !== undefined){
        tempQuery=`?square=${parseURL.query.square}`;
        if(req.query.text !== undefined){
            tempQuery+=`&text=${encodeURIComponent(parseURL.query.text)}`;
        }
    }
    else{
        if(req.query.text !== undefined){
            tempQuery=`?text=${encodeURIComponent(parseURL.query.text)}`;
        }
    }
    return tempQuery;
}

//Adds data to be coded to recentPath, spliced between x,1 and length of 10
function addedData(encoded){
    recs.recentPath.forEach((value, x) => {
        if (value === encoded) {
            recs.recentPath.splice(x, 1)
        }
    });
    if (recs.recentPath.length >= 10) {
        recs.recentPath.shift()
    }
    recs.recentPath.push(encoded)
}

//Reverses sizes lists
app.get("/stats/sizes/recent", function (req, res) {
    let reveresedLists = recs.recentSizes
    res.send(reveresedLists.reverse())
    reveresedLists.reverse()
    return
})

//Gets 3 sleeping intervals based on current time and server execution
app.get("/stats/hits", function (req, res) {
    const curDate = Date.now()
    let t_json = [{
            "title": '5s',
            "count": 0
        },
        {
            "title": '10s',
            "count": 0
        },
        {
            "title": '15s',
            "count": 0
        }
    ]
    updateHits(curDate,t_json);

    res.send(t_json)
    return
})
//iterate over last size list and update
function updateLastSize(hW)
{
for(let x=0;x<recs.recentSizes.length;x++){
        if (recs.recentSizes[x].w == hW.w
            && recs.recentSizes[x].h == hW.h) {
            recs.recentSizes.splice(x, 1)
        }
    }
}
//This function inputs the recent size on the webpage when you click edit image
function addRecordLastSize(width,height){
    let hW = {
        "h": height,
        "w": width
    }

    updateLastSize(hW);

    if (recs.recentSizes.length >= 10) {
        recs.recentSizes.shift()
    }

    recs.recentSizes.push(hW)
}

//Reversed List for recent text
app.get("/stats/texts/recent", function (req, res) {
    let reveresedLists = recs.recentText
    res.send(reveresedLists.reverse())
    reveresedLists.reverse()
    return
})
//iterate over Last text list and update
function updaterecentText(pTQuery)
{
recs.recentText.forEach((value, x) =>  {
            if (value == pTQuery) {
                recs.recentText.splice(x, 1)
            }
        });
}
//This will add most recent text on webpage when inputed at edit image
function addRecordrecentText(pURL){
    let pTQuery = pURL.query.text;
    if (pTQuery !== undefined) {
        updaterecentText(pTQuery);
        if (recs.recentText.length >= 10) {
            recs.recentText.shift()
        }
        recs.recentText.push(pTQuery)
    }
}

//Sorts the unsorted arrays
app.get("/stats/referrers/top", function (req, res) {
    let arrUnsorted = recs.topRefs.sort(sortedProperty("n"))
    res.send(arrUnsorted.reverse().slice(0, 10))
    return
})
//cleanup up all records
app.delete("/stats", function (req, res) {
    recs = new Recs();
    res.send()
})
