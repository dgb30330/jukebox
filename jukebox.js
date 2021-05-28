var redirect = "http://localhost/"; 
// deployment url here - be sure to update allowed redirect urls on spotify developer dashboard
var id = "your client id"; // TODO add client id
var secret = "your client secret"; // TODO add client secret

var playlistData = null;
var queue = [];

localStorage.setItem("access_token","none");
const NUM_BUTTONS = 50;
const QUEUE_LIMIT = 25;
const NO_ACTIVITY_ID = "xxx";

var playlistID = "default playlist id"; // TODO add playlist id
var device_id = "default device id"; // TODO add device id

AUTHORIZE = "https://accounts.spotify.com/authorize";
TOKEN = "https://accounts.spotify.com/api/token";
PLAYLIST = "https://api.spotify.com/v1/playlists/";
STATUS = "https://api.spotify.com/v1/me/player";
PLAY = "https://api.spotify.com/v1/me/player/play";
QUEUE = "https://api.spotify.com/v1/me/player/queue";

var orange = "#ff3c00";
var dark = "#2d1307";
var white = "#FFFFFF";
var tagWidth = 160;
var tagHeight = 40;

function onLoad(){
    if(window.location.search.length > 0){
        handleRedirect();
    }
    else{
        if(localStorage.getItem("access_token")=="none"){
            resetQueue();
            requestAuth();
        }
        
    }
}

function handleRedirect(){
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("","",redirect);

}

function fetchAccessToken(code){
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri="+ encodeURI(redirect);
    body += "&client_id="+id;
    body += "&client_secret="+secret;
    callAuthoriztionAPI(body);

}

function callAuthoriztionAPI(body){
    let xhr = new XMLHttpRequest();
    xhr.open("POST",TOKEN, true);
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(id+":"+secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id="+id;
    callAuthoriztionAPI(body);
}

function handleAuthorizationResponse(){
    if(this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        var data = JSON.parse(this.responseText);
        if(data.access_token != undefined){
            access_token = data.access_token;
            localStorage.setItem("access_token",access_token);
        }
        if(data.refresh_token != undefined){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token",refresh_token);
        }
        getPlaylist();
    }
    else{
        console.log(this.responseText);
        alert("AUTH ERROR")
    }
}

function getCode(){
    let code = null;
    const queryString = window.location.search;
    if (queryString.length > 0){
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code');
    }


    return code;
}


function requestAuth(){
    localStorage.setItem("client_id",id);
    localStorage.setItem("client_secret",secret);

    let url = AUTHORIZE;
    url += "?client_id=" + id;
    url += "&response_type=code";
    url += "&redirect_uri="+ encodeURI(redirect);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-playback-state user-modify-playback-state"
    window.location.href = url;
}

function callAPI(method,url,body,callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method,url,true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    // watch - need readback from local storage?
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;

}

function playTrack(trackID){
    let body = {};
    var trackURI = "spotify:track:" + trackID;
    body.uris = [trackURI];
    callAPI("PUT",PLAY + "?device_id=" + device_id,JSON.stringify(body),updatePlayer);
}

function addQueue(trackID){
    var trackURI = "spotify:track:" + trackID;
    callAPI("POST",QUEUE + "?uri=" + trackURI,JSON.null,updatePlayer);
}

function getPlaylist(){
    playlistUrl = PLAYLIST+playlistID;
    callAPI("GET",playlistUrl,null,parsePlaylist);
}

function getStatus(){
    callAPI("GET",STATUS,null,parseStatus)
}

function getUpdate(){
    callAPI("GET",STATUS,null,parseUpdate)
}

// callback handlers below, follow structure

function parsePlaylist(){
    if (this.status == 200){ // ok
        var data = JSON.parse(this.responseText);
        console.log(data);
        playlistData = data;
        setUpPages();
        populateButtons();
        updateReadout(data.id,device_id);
        getUpdate();
    }
    else if (this.status == 401){
        refreshAccessToken();
    }
    else{
        console.log(this.responseText);
        alert("ERROR: " + this.responseText);
    }
}

function parseUpdate(){
    if (this.status == 200){ // ok
        var data = JSON.parse(this.responseText);
        console.log(data);
        if(data.is_playing == false){
            console.log("200 not playing");
            resetQueue();
        }
        else{
            console.log("200 playing");
            if(data.item == null){
                resetQueue("Other Device In Use - Turn Off");
            }
            else{
                if(queue.length>0){
                    if(!verifyNowPlaying(data.item.id)){
                        findNowPlaying(data.item.id);
                    }
                }
                else{
                    resetQueue("Other Audio",data.item.id);
                }
            }
        }
    }
    else if (this.status == 401){
        console.log("refresh auth");
        refreshAccessToken();
    }
    else{
        // no activity 
        console.log("non 200 status");
        resetQueue();
    }
    setTimeout(function(){ getUpdate(); }, 3000);

}

function parseStatus(){
    var trackHolder = localStorage.getItem("active_track");
    if (this.status == 200){ // ok
        var data = JSON.parse(this.responseText);
        if(data.is_playing == false){
            playTrack(trackHolder);
        }
        else{
            addQueue(trackHolder);
        }
        //further actions
    }
    else if (this.status == 401){
        refreshAccessToken();
    }
    else{
        console.log(this.responseText);
        alert(this.responseText);
        playTrack(trackHolder);
    }
}

function updatePlayer(){
    if (this.status == 204){ // ok
        // display playback info
        //further actions -> call self using set timeout? 
    }
    else if (this.status == 401){
        refreshAccessToken();
    }
    else{
        console.log(this.responseText);
        alert(this.responseText);
    }
}

// work with data

function populateButtons(){
    var i;
    var tempID;
    var limit;
    if(NUM_BUTTONS+activeLow<playlistData.tracks.items.length){
        limit = NUM_BUTTONS;
    }
    else{
        limit = playlistData.tracks.items.length - activeLow;
        for(i=limit;i<NUM_BUTTONS;i++){
            tempID = 't' + i.toString();
            document.getElementById(tempID).style.visibility = "hidden";
            tempID = 'i' + i.toString();
            document.getElementById(tempID).style.visibility = "hidden";
        }
    }
    for(i=0;i<limit;i++){
        tempID = 't' + i.toString();
        renderTag(tempID,playlistData.tracks.items[i+activeLow].track.artists[0].name,playlistData.tracks.items[i+activeLow].track.name);
        document.getElementById(tempID).style.visibility = "visible";
        document.getElementById(tempID).value = makeSongObject(playlistData.tracks.items[i+activeLow].track.id,
            playlistData.tracks.items[i+activeLow].track.artists[0].name,playlistData.tracks.items[i+activeLow].track.name);
        tempID = 'i' + i.toString();
        document.getElementById(tempID).style.visibility = "visible";
        setImage(tempID,playlistData.tracks.items[i+activeLow].track.album.images[2].url)
        /*
        thisButton.addEventListener("click", function(){
            buttonHandler(thisButton.value);
        });
        */
    }
}

function buttonHandler(buttonID){
    if(queue.length<QUEUE_LIMIT){
        var trackID = document.getElementById(buttonID).value.id;
        if(notInQueue(trackID)){
            if(queue[0].id==NO_ACTIVITY_ID){
                queue = [];
            }
            queue.push(document.getElementById(buttonID).value);
            renderQueue();
            if(trackID.length > 0){
                localStorage.setItem("active_track",trackID);
                //build in queue monitor later if playing add queue, else play track
                getStatus();
                //playTrack(trackID);
            }
        }
        else{
            alert("ALREADY IN QUEUE");
        }
    }
    else{
        alert("QUEUE FULL");
    }

}
function renderTagBack(tagID){
    var img = document.getElementById(tagID);	
	var ctx = img.getContext("2d");
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, 160, 400);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 40);
    ctx.lineTo(160, 40);
    ctx.lineTo(160, 0);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = orange;
    ctx.stroke();
    ctx.moveTo(0, 20);
    ctx.lineTo(160, 20);
    ctx.strokeStyle = orange;
    ctx.stroke();

}

function renderTag(tagID,artist,title){
    renderTagBack(tagID);
    var fit = false;
    var fontSize = 18;
    var img = document.getElementById(tagID);	
	var ctx = img.getContext("2d");
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = dark;
    while(!fit){
        ctx.font = "bold " + fontSize + "px Verdana";
        if(ctx.measureText(artist).width < tagWidth-4){
            fit = true;
            }
        else fontSize -= 1;
    }
    ctx.fillText(artist,tagWidth/2,tagHeight/4);
    fontSize = 18;
    fit = false;
    while(!fit){
        ctx.font = fontSize + "px Verdana";
        if(ctx.measureText("\""+title+"\"").width < tagWidth-4){
            fit = true;
            }
        else fontSize -= 1;
    }
    ctx.fillText("\""+title+"\"",tagWidth/2,(tagHeight/4)*3);
}

function setImage(imgID,newSRC){
    thisImg = document.getElementById(imgID);
    thisImg.src = newSRC;
}

function updateReadout(playlist,device){
    readout = document.getElementById("readout");
    readout.innerHTML = "playlist: " + playlist + " playing on: " + device;
}
function renderQueue(){
    var i;
    var tempID;
    for(i=0;i<QUEUE_LIMIT;i++){
        tempID = 'q' + i.toString();
        if(i<queue.length){
            document.getElementById(tempID).innerHTML = queue[i].string;
        }
        else{
            document.getElementById(tempID).innerHTML = "";
        }
    }
}

function findNowPlaying(trackID){
    var i;
    while(queue.length>0 && queue[0].id != trackID){
        queue.splice(0,1);
    }
    if(queue.length == 0){
        resetQueue("Other Audio",trackID);
    }
    else{
        renderQueue();
    }
}

function verifyNowPlaying(trackID){
    var status = false;
    if(trackID == queue[0].id){
        status = true;
    }
    return status;
}

function notInQueue(trackID){
    var i;
    var clear = true;
    for(i=0;i<queue.length;i++){
        if(queue[i].id == trackID){
            clear = false;
        }
    }
    return clear;
}

function makeSongObject(songID,artist,title){
    var readoutString = artist + " - " + title;
    if(readoutString.length > 30){
        readoutString = readoutString.substr(0,30) + "...";
    }
    var thisSong = {string: readoutString, id: songID};
    return thisSong;
}

function resetQueue(msg="Nothing",id=NO_ACTIVITY_ID){
    queue = [];
    queue.push(makeSongObject(id,msg,"Select a song."));
    renderQueue();
}

function changePlaylist(){
    var newPlaylist = prompt("Enter new playlist ID:",playlistID);
    if(newPlaylist != null && newPlaylist!=playlistID){
        playlistID = newPlaylist;
        getPlaylist();
    }
}

function setUpPages(){
    activeLow = 0;
    if(playlistData.tracks.items.length>NUM_BUTTONS){
        document.getElementById("prev").style.visibility = "visible";
        document.getElementById("next").style.visibility = "visible";
    }
    else{
        document.getElementById("prev").style.visibility = "hidden";
        document.getElementById("next").style.visibility = "hidden";
    }
}

function nextPage(){
    if(activeLow+NUM_BUTTONS<playlistData.tracks.items.length){
        activeLow+=NUM_BUTTONS;
        populateButtons();
    }

}

function prevPage(){
    if(activeLow-NUM_BUTTONS>=0){
        activeLow-=NUM_BUTTONS;
        populateButtons();
        
    }
}
