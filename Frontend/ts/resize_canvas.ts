function resizeCanvases() {
    let pong_anim_Canvas = document.getElementById("pong_animation") as HTMLCanvasElement;
    let ping_anim_Canvas = document.getElementById("ping_animation") as HTMLCanvasElement;

    if (pong_anim_Canvas) {
        pong_anim_Canvas.width = pong_anim_Canvas.clientWidth;
        pong_anim_Canvas.height = pong_anim_Canvas.clientHeight;
    }

    if (ping_anim_Canvas) {
        ping_anim_Canvas.width = ping_anim_Canvas.clientWidth;
        ping_anim_Canvas.height = ping_anim_Canvas.clientHeight;
    }
}

window.addEventListener("resize", resizeCanvases);
document.addEventListener("DOMContentLoaded", resizeCanvases);
