
var socket = io("http://localhost:8090");

socket.on("Server-send-your-message",function(data){
    $(".ChatLog").append("<li class='ChatLog__entry ChatLog__entry_mine'><p class='ChatLog__message'>"+data+"</p></li>");
});
socket.on("Server-send-your-message",function(data){
    $(".ChatLog").append("<li class='ChatLog__entry'><div class='ChatLog__avatar'>A</div><p class='ChatLog__message'>"+data+"</p></li>");
})
$(document).ready(function(){

    $("#chat").show();
    $(".pop-up-box").hide();
    $("#mess").focus();
    $("#chat").click(function(){
        $(".pop-up-box").show();
        $("#chat").hide();
    })
    $("#close").click(function(){
        $(".pop-up-box").hide();
        $("#chat").show();
    })

    $(".pop-up-head").click(function(){
        $(".pop-up-box").hide();
        $("#chat").show();
    })
    $("#btnSend").click(function(){
        if(($("#mess").val()!=null) && ($("#mess").val()!="")){
            socket.emit("Client-send-messages", $("#mess").val());
            $("#mess").val("");
        }
    })
    $("#mess").keyup(function(event){
        if((event.keyCode == 13 ) && ($("#mess").val()!=null) && ($("#mess").val()!="")){
            $("#btnSend").click();
        }        
    });
})