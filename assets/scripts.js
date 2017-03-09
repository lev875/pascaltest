var output = document.getElementById("output");
var stdin = document.getElementById("stdin");
var errors = document.getElementById("errors");
var editor = ace.edit("editor");
var session = editor.getSession();
var firepad;
var uid;
var config = {
    apiKey: "AIzaSyDZp3pyrbZm34cnXJcVB5PzUeUOAkeaGHA",
    authDomain: "pascalcollab.firebaseapp.com",
    databaseURL: "https://pascalcollab.firebaseio.com"
};

firebase.initializeApp(config);
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        //uid = user.uid;
        uid = "user1"; //For testing only
        firebase.database().ref("users/" + uid).once("value").then(update);
    } else {
        console.log("Not logged in!");
    }
});

session.setUseWrapMode(true);
session.setUseWorker(false);
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode("ace/mode/pascal");
editor.setValue("begin\r\n\ \t writeln(\'hello world\');\r\nend.");

output.value = ''
stdin.value = ''
errors.value = ''

addBtn($('#root'), 'F');
addBtn($('#root'), '');

function update(snapshot){
    $("#root").children().remove();
    addBtn($('#root'), 'F');
    addBtn($('#root'), '');
    var obj = snapshot.val();
    for(var key in obj){
        if(typeof obj[key] != "object" && obj[key] != ""){
            addFile($("#root"), key, false)
        } else {
            var folder = addFolder($("#root"), key, false);
            for(var k in obj[key]){
                addFile(folder, k, false);
            }
        }
    }
    $(".container").removeClass("disabled");
}

function changeTab(tabName) {
    var i
    var x = document.getElementsByClassName("tab")

    for (i = 0; i < x.length; i++) {
        x[i].style.display = 'none'
    }

    document.getElementById(tabName).style.display = "block"
    document.getElementById('selected').id = ''
    document.getElementsByClassName(tabName + 'L')[0].id = 'selected'
}


function sendCode() {
    var xhr = new XMLHttpRequest()
    var body = JSON.stringify({
        code: editor.getSession().getValue(),
        input: stdin.value
    });

    output.value = ''
    stdin.value = ''
    errors.value = ''

    xhr.open('POST', '/compile', true)
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8')
    xhr.send(body)
    xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;

        button.innerHTML = "Send"
        button.disabled = false
        var res = JSON.parse(xhr.responseText)
        output.value = res.output
        errors.value = res.err
        if (res.output != '') {
            changeTab('output')
        }
        if (res.output === '' && res.errors != '') {
            changeTab('errors')
        }
    }

    button.innerHTML = 'Loading...'
    button.disabled = true
    setTimeout(() => {
        button.innerHTML = "Send";
        button.disabled = false
    }, 7500)
}

function addFile(parent, name, f) {
    var id = $(parent).attr('id') + '/' + name
    if (!document.getElementById(id) && name.search("/") === -1) {
        if(f) CreateCode(name, id);
        var li = $('<li></li>');
        var span = $("<span>" + name + "</span>");
        span.css("display", "inline-block");
        $(parent).prepend(li);
        li.append(span);
        li.append('<button class="btn" onClick = "removeFile(this, \'' + id +'\')">-</button>');
        li.attr('id', id);
        span.click(function(){
            GetCode(id); 
        })
    } else alert('invalid name')
}

function removeFile(parent, id){
    var path = id.slice(id.search("/") + 1);
    var userRef = firebase.database().ref("users/" + uid +  "/" + path);
    var fileHash;
    $(parent).parent().remove();
    userRef.once("value").then(function (snapshot){
        fileHash = snapshot.val();
        var codeRef = firebase.database().ref("usercode/" + fileHash);
        codeRef.remove();
        userRef.remove();
    });
}

function addFolder(parent, name, f) {
    var id = $(parent).attr('id') + '/' + name;
    if (!document.getElementById(id) && name.search("/") === -1) {
        if(f) firebase.database().ref("users/" + uid + "/" + name).set("");
        var ul = $('<ul></ul>')
        var span = $('<span></span>')
        $(parent).append(span)
        span.text(name)
        $(parent).append(ul)
        span.append('<button class="btn" onClick = "removeFolder(this, \'' + id +'\')">-</button>') //Запилить нормальное удаление
        ul.attr('id', id)
        addBtn(ul, '')
        span.click(function() {
            $(this).next().children().fadeToggle('fast')
        });
        return ul;
    } else alert('invalid name')
}

function removeFolder(parent, id){
    var path = id.slice(id.search("/") + 1); 
    var ref = firebase.database().ref("users/" + uid +  "/" + path);
    $(parent).parent().next().remove();
    $(parent).parent().remove();
    ref.once("value").then(function (snapshot){
        var obj = snapshot.val();
        var codeRef = firebase.database().ref("usercode/");
        for(var key in obj){
            codeRef.child(obj[key]).remove();
        }
        ref.remove();
    });
}

function addBtn(parent, name) {
    $(parent).prepend($('<button></button>').text('+' + name).attr({
        "onClick": "getName" + name + "(this)",
        "class": "btn"
    }))
}

function getName(parent) {
    $('.btn').css('visibility', 'hidden')
    var tarea = $('<textarea></textarea>')
    $(parent).before(tarea)
    tarea.keyup(function(e) {
        if (e.keyCode == 13) {
            var txt = tarea.val()
            txt = txt.slice(0,-1);
            tarea.remove()
            addFile($(parent).parent(), txt, true)
            $('.btn').css('visibility', 'visible')
        }
        if (e.keyCode == 27) {
            $('.btn').css('visibility', 'visible')
            tarea.remove()
        }
    });
}

function getNameF(parent) {
    $('.btn').css('visibility', 'hidden')
    var tarea = $('<textarea></textarea>')
    $(parent).before(tarea)
    tarea.keyup(function(e) {
        if (e.keyCode == 13) {
            var txt = tarea.val();
            txt = txt.slice(0,-1);
            $('.btn').css('visibility', 'visible')
            addFolder($(parent).parent(), txt, true)
            tarea.remove()
        }
        if (e.keyCode == 27) {
            $('.btn').css('visibility', 'visible')
            tarea.remove()
        }
    });
}

function CreateCode(filename, id){
    var ref = firebase.database().ref("usercode/").push();
    ref.set({
        creator: uid, //For testing only
        collaborators: {
            user2: true
        },
        readers: {
            user3: true
        }
    });
    var path = id.slice(id.search("/") + 1);
    firebase.database().ref("users/" + uid + "/" + path).set(ref.key); 
    ref = ref.child("code/");
    if (firepad) firepad.dispose();
    var div = $("<div>")
    $("#editor").before(div);
    $("#editor").remove();
    div.attr("id", "editor");
    editor = ace.edit("editor");
    session = editor.getSession();
    session.setUseWrapMode(true);
    session.setUseWorker(false);
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/pascal");
    firepad = Firepad.fromACE(ref, editor, {
        defaultText: "begin\r\n\ \t writeln(\'hello world\');\r\nend."
    });
}

function GetCode(id){
    $(".container").addClass("disabled");
    var ref = firebase.database().ref("usercode/");
    var path = id.slice(id.search("/") + 1); 
    var FileHash;
    firebase.database().ref("users/" + uid + "/" + path).once("value").then(function(snapshot) {
        if (snapshot) {
            fileHash = snapshot.val();
            ref = ref.child(fileHash);
            ref = ref.child("code/")
            if (firepad) firepad.dispose();
            var div = $("<div>")
            $("#editor").before(div);
            $("#editor").remove();
            div.attr("id", "editor");
            editor = ace.edit("editor");
            session = editor.getSession();
            session.setUseWrapMode(true);
            session.setUseWorker(false);
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/pascal");
            firepad = Firepad.fromACE(ref, editor);
            $(".container").removeClass("disabled");
        }
    });
}
