var socket = io("http://localhost:8090");
 socket.on("gui-comment",function(data){
     $("#showcomment").val(data);
       $("#Comment").val("");
 })
 socket.on("add-product",function(){
     alert("Có sản phẩm mới được tải lên !! Vui lòng load lại trang để xem sản phẩm mới nhất");
 })

 // report san pham
socket.on("report",function(){
   $("#send-report").click(function(){
    $(".text-report").slideUp();
       $("#thanks-report").fadeTo(2500,1).fadeOut(2500);
       $("#textarea").val("");
   });
})
$(document).ready(function(){
    $("#btn-report").click(function(){
        $(".text-report").slideToggle();
    });
    $("#send-report").click(function(){
        socket.emit("report",$("#textarea").val());
       })
    
});

// hien thong tin user khi vao trang chi tiet san pham
$(document).ready(function(){
    $("#showphone").click(function(){
        $("#user-infomation").slideToggle();
    })
})
$(document).ready(function(){
    $('#AlphaNav > ul > li > a').click(function () {
        $(this).closest('li').siblings().find('ul:visible').slideUp(); // ADDED
        $(this).closest('li').siblings().find('ul:visible').parent().find('i').toggleClass('fa-angle-double-up fa-angle-double-down'); // ADDED 2
        $(this).closest('li').find('ul').slideToggle();
        $(this).find('i').toggleClass('fa-angle-double-up fa-angle-double-down');
        
    });
   
    socket.emit("list-sp");
    $("#like").click(function(){
        if( $("#like").attr("src")=="/imagei/like.png")
       {
           $("#like").attr("src","/imagei/like1.png")
        }
        else
        $("#like").attr("src","/imagei/like.png")
    })
    $("#follow").click(function(){
        if( $("#follow").attr("src")=="/imagei/unfollow.png")
       {
           $("#follow").attr("src","/imagei/follow.png")
           $("#theodoi").html("Đã theo dõi");
           $("#theodoi").attr("style","color: blue")
        }
        else
       { 
           $("#follow").attr("src","/imagei/unfollow.png");
           $("#theodoi").html("Theo dõi");
           $("#theodoi").attr("style","color: rgb(177, 174, 171)")
    }
    })
    $("#mota").show();
    $("#binhluan").hide();
    $("#mota").click(function(){
        mota();
    })
    $("#binhluan").click(function(){
        binhluan();
    })
    socket.emit("gui-thong-tin");
    $("#send").click(function(){
        socket.emit("gui-comment",$("#attached").html()+"ooo"+$("#code").html()+"ooo"+$("#showcomment").val()+"ooo"+$("#Comment").val()+"ooo"+$("#tenuser").val());
    })
})
function binhluan(){
$("#mota").hide();
$("#binhluan").show();
}
function  mota(){
    $("#mota").show();
    $("#binhluan").hide();
}
$(document).ready(function(){
    $("#filterProduct").click(function(){
        $("#filter-wrapper").slideToggle();
    })
})