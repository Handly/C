function loadLogin() {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/login";
    var params = "username=" + document.getElementById("name").value + "&password=" + document.getElementById("pass").value;
    xhttp.open("POST", url, false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send(params);
    document.getElementById("demo3").innerHTML = xhttp.statusText;
    document.getElementById("demo2").innerHTML = xhttp.getAllResponseHeaders();
    document.getElementById("demo").innerHTML = JSON.stringify(JSON.parse(xhttp.responseText), null, 4);
    //fetchGame();
}

function createGame() {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/setup/ai";
    var params = "variant=" + document.getElementById("variant").value + "&timeMode=" + document.getElementById("timeMode").value + "&days=2&time=10&increment=0&level=" + document.getElementById("level").value + "&color=" + document.getElementById("color").value;
    xhttp.open("POST", url, false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send(params);
}

function loadUser() {

    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/account/info/";
    var bustCache = '?' + new Date().getTime();
    xhttp.open("GET", url + bustCache, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();
    document.getElementById("demo3").innerHTML = xhttp.statusText;
    document.getElementById("demo2").innerHTML = xhttp.getAllResponseHeaders();
    document.getElementById("demo").innerHTML = JSON.stringify(JSON.parse(xhttp.responseText), null, 4);

    document.getElementById("gameList").innerHTML = "null";

    for (i = 0; i < JSON.parse(xhttp.responseText).nowPlaying.length; i++) {
        innerOptions = document.getElementById("gameList").innerHTML;
        document.getElementById("gameList").innerHTML = innerOptions + "<option value=" + JSON.parse(xhttp.responseText).nowPlaying[i].fullId + ">" + JSON.parse(xhttp.responseText).nowPlaying[i].fullId + "</option>";
    }

    document.getElementById("gameConnectButton").disabled = false;
}

function loadLogout() {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/logout";
    xhttp.open("GET", url, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();
    document.getElementById("demo3").innerHTML = xhttp.statusText;
    document.getElementById("demo2").innerHTML = xhttp.getAllResponseHeaders();
    document.getElementById("demo").innerHTML = JSON.stringify(JSON.parse(xhttp.responseText), null, 4);


    try {
        clearInterval(pinger);
        socket.close();
    }
    catch (err) {

    }
}

function fetchSocketUrl(fullID) {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/" + fullID;
    xhttp.open("GET", url, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();
    //alert(url);

    var socketURL = JSON.parse(xhttp.responseText).url.socket;
    //alert(socketURL);
    return socketURL;
}

//function fetchGame() {
//    var xhttp = new XMLHttpRequest();
//    var url = "http://en.lichess.org/j0SSEyuWXeBu";
//    xhttp.open("GET", url, false);

//    // send the proper header information along with the request
//    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
//    xhttp.send();
//    //alert(url);

//    alert(JSON.stringify(JSON.parse(xhttp.responseText)));

//}

function fetchFullID() {

    var fullID = document.getElementById("gameList").value;

    //alert(fullID);
    return fullID;
}

function fetchVersion(fullID) {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/" + fullID;
    xhttp.open("GET", url, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();
    //alert(url);

    var version = JSON.parse(xhttp.responseText).player.version;

    return version;
}

function updateVersion(version) {
    window.version = version;
    //alert("version is now: " + version);
}

// connect to a game as a player
function gameConnect() {
    // var fullID = document.getElementById("fullID").value;
    var fullID = fetchFullID();
    var versionInit = fetchVersion(fullID);
    updateVersion(versionInit);

    var baseUrl = fetchSocketUrl(fullID); // obtained from game creation API (`url.socket`)
    clientId = Math.random().toString(36).substring(2); // created and stored by the client

    var socketUrl = 'ws://socket.en.lichess.org:9021' + baseUrl + '?sri=' + clientId + '&ran=--ranph--';
    //alert(socketUrl);

    try {
        socket.close();
    }
    catch (err) {

    }

    window.socket = new WebSocket(socketUrl);

    socket.onopen = function () {

        window.pinger = setInterval(function () {

            socket.send(JSON.stringify({
                t: 'p',
                v: version
            }));

        }, 2000)

    };

    socket.onmessage = function (event) {
        //alert("I received a message!");
        
        var currEvent = event;
        var eventData = JSON.parse(currEvent.data);
        if (eventData.hasOwnProperty("t")) {
            //alert(eventData.d.uci);
            if (eventData.t == "move") {
                board.move(eventData.d.uci.substring(0, 2) + "-" + eventData.d.uci.substring(2, 4));
                bluetoothSerial.write(eventData.d.uci);
            }
            else if (eventData.t == "b") {
                if (eventData.d[(eventData.d.length) - 1].t == "end") {
                    board.move(eventData.d[(eventData.d.length) - 2].d.uci.substring(0, 2) + "-" + (eventData.d[(eventData.d.length) - 2].d.uci.substring(2, 4)));
                    bluetoothSerial.write(eventData.d[(eventData.d.length) - 2].d.uci);
                    //switch the below to a getWinner function later on (can retreive info about finished games on lichess)
                    if (!window.winner) {
                        window.winner = eventData.d[(eventData.d.length) - 2].d.winner;
                        setTimeout(function () { alert(winner + " wins!"); }, 1000);
                    }
                }
            }
        }
        


        //    if (currcurrEvent.d.uci) {
        //        updateVersion(currEvent.d.uci);
        //        if (document.getElementById('autoSend').checked) {
        //            console.log(currEvent.d.uci.substring(0, 2) + "-" + currEvent.d.uci.substring(2, 4));
        //            board.move(currEvent.d.uci.substring(0, 2) + "-" + currEvent.d.uci.substring(2, 4));
        //            bluetoothSerial.write(currEvent.d.uci);
        //        }
        //        document.getElementById("opponentMove").value = currEvent.d.uci;
        //        //if (d.castle)
        //        //    alert("castle!");
        //        //if (d.enpassant)
        //        //    alert("en passant!");
        //        if (d.check)
        //            alert("check!");
        //    }
        //    else if (currEvent.d[1].t == "end") {
        //        if (document.getElementById('autoSend').checked) {
        //            console.log(currEvent.d[0].uci.substring(0, 2) + "-" + currEvent.d[0].uci.substring(2, 4));
        //            board.move(currEvent.d[0].uci.substring(0, 2) + "-" + currEvent.d[0].uci.substring(2, 4));
        //            bluetoothSerial.write(currEvent.d[0].d.uci);
        //        }
        //        document.getElementById("opponentMove").value = currEvent.d[0].d.uci;
        //        if (d[1].d)
        //            alert(d[1].d + "wins!");
        //        else
        //            alert("stalemate!");
        //    }
    

        if (document.getElementById("autoLog").checked) {
            var innerStuff = document.getElementById("demo4").innerHTML;
            document.getElementById("demo4").innerHTML = innerStuff + 'received: ' + currEvent.data + "<br>";
        }


    };

    socket.onerror = function () {
        alert('error occurred!');
    };

    socket.onclose = function (event) {
        alert('connection lost! Please Reconnect to game');
        clearInterval(pinger);
        socket.close();
        //gameConnect();
    };

}

function sendMove() {
    var move = {
        t: 'move',
        d: {
            from: document.getElementById("from").value,
            to: document.getElementById("to").value
        }
    };
    socket.send(JSON.stringify(move));
}