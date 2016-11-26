function loadLogin() {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/login";
    var params = "username=" + document.getElementById("name").value + "&password=" + document.getElementById("pass").value;
    xhttp.open("POST", url, false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send(params);
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

    loadUser();
}

function loadUser() {

    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/account/info/";
    var bustCache = '?' + new Date().getTime();
    xhttp.open("GET", url + bustCache, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();

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

function fetchFEN(fullID) {
    var xhttp = new XMLHttpRequest();
    var url = "http://en.lichess.org/" + fullID;
    xhttp.open("GET", url, false);

    // send the proper header information along with the request
    xhttp.setRequestHeader("Accept", "application/vnd.lichess.v1+json");
    xhttp.send();
    //alert(url);

    //var currentFEN = JSON.parse(xhttp.responseText).game.fen;
    //var n = currentFEN.indexOf(" ");

    //return currentFEN.slice(0, n);

    var currentFEN = JSON.parse(xhttp.responseText).game.fen;

    return currentFEN;
}

function updateVersion(version) {
    window.version = version;
    //alert("version is now: " + version);
}

// connect to a game as a player
function gameConnect() {
    window.awaitingAck = false;
    window.winner = false;
    
    // var fullID = document.getElementById("fullID").value;
    var fullID = fetchFullID();
    window.currentGame = fullID;
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

        //setTimeout(function () { alert('connected!'); }, 1);
        syncFEN();


    };

    socket.onmessage = function (event) {
        //alert("I received a message!");
        
        var currEvent = event;
        var eventData = JSON.parse(currEvent.data);
        if (eventData.hasOwnProperty("t")) {
            //alert(eventData.d.uci);
            if (eventData.t == "resync") {
                gameConnect();
                //setTimeout(function () { alert("game resynced and connected!"); }, 1);
                
            }
            if (awaitingAck && eventData.t != "ack") {
                sendMove();
            }
            else if (awaitingAck && eventData.t == "ack") {
                //alert("ack received");
                awaitingAck = false;
            }
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
    




    };

    socket.onerror = function () {
        alert('error occurred!');
    };

    socket.onclose = function (event) {
        //setTimeout(function () { alert('connection lost! Please Reconnect to game'); }, 1);
        
        clearInterval(pinger);
        //socket.close();
        //gameConnect();
    };

}

function syncFEN() {
    board.position(fetchFEN(currentGame), false);
}

function sendMove() {
    var move = {
        t: 'move',
        d: {
            from: document.getElementById("from").value,
            to: document.getElementById("to").value
        }
    };
    //send initially
    //socket.send(JSON.stringify(move));
    //send periodically until lichess responds with "ack"
    //window.moveSender = setInterval(function () {

    //    socket.send(JSON.stringify(move));

    //}, 100)

    socket.send(JSON.stringify(move));
    window.awaitingAck = true;
}