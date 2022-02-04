// =============== HAMBURGER MENU ===============
$(function () {

    let navbar = document.querySelector('.navbar');
    var $burger = $('.burger');
    var $bars = $('.burger-svg__bars');
    var $bar = $('.burger-svg__bar');
    var $bar1 = $('.burger-svg__bar-1');
    var $bar2 = $('.burger-svg__bar-2');
    var $bar3 = $('.burger-svg__bar-3');
    var isChangingState = false;
    var isOpen = false;
    var burgerTL = new TimelineMax();

    function burgerOver() {

        if (!isChangingState) {
            burgerTL.clear();
            if (!isOpen) {
                burgerTL.to($bar1, 0.5, {
                        y: -2,
                        ease: Elastic.easeOut
                    })
                    .to($bar2, 0.5, {
                        scaleX: 0.6,
                        ease: Elastic.easeOut,
                        transformOrigin: "50% 50%"
                    }, "-=0.5")
                    .to($bar3, 0.5, {
                        y: 2,
                        ease: Elastic.easeOut
                    }, "-=0.5");
            } else {
                burgerTL.to($bar1, 0.5, {
                        scaleX: 1.2,
                        ease: Elastic.easeOut
                    })
                    .to($bar3, 0.5, {
                        scaleX: 1.2,
                        ease: Elastic.easeOut
                    }, "-=0.5");
            }
        }
    }

    function burgerOut() {
        if (!isChangingState) {
            burgerTL.clear();
            if (!isOpen) {
                burgerTL.to($bar1, 0.5, {
                        y: 0,
                        ease: Elastic.easeOut
                    })
                    .to($bar2, 0.5, {
                        scaleX: 1,
                        ease: Elastic.easeOut,
                        transformOrigin: "50% 50%"
                    }, "-=0.5")
                    .to($bar3, 0.5, {
                        y: 0,
                        ease: Elastic.easeOut
                    }, "-=0.5");
            } else {
                burgerTL.to($bar1, 0.5, {
                        scaleX: 1,
                        ease: Elastic.easeOut
                    })
                    .to($bar3, 0.5, {
                        scaleX: 1,
                        ease: Elastic.easeOut
                    }, "-=0.5");
            }
        }
    }

    function showCloseBurger() {
        burgerTL.clear();
        burgerTL.to($bar1, 0.3, {
                y: 12, // move the bar up
                ease: Power4.easeIn
            })
            .to($bar2, 0.3, {
                scaleX: 1,
                ease: Power4.easeIn
            }, "-=0.3")
            .to($bar3, 0.3, {
                y: -12, // move the bar down
                ease: Power4.easeIn
            }, "-=0.3")
            .to($bar1, 0.5, {
                rotation: 45,
                ease: Elastic.easeOut,
                transformOrigin: "50% 50%"
            })
            .set($bar2, {
                opacity: 0,
                immediateRender: false
            }, "-=0.5")
            .to($bar3, 0.5, {
                rotation: -45,
                ease: Elastic.easeOut,
                transformOrigin: "50% 50%",
                onComplete: function () {
                    isChangingState = false;
                    isOpen = true;
                }
            }, "-=0.5");
    }

    function showOpenBurger() {
        burgerTL.clear();
        burgerTL.to($bar1, 0.3, {
                scaleX: 0,
                ease: Back.easeIn
            })
            .to($bar3, 0.3, {
                scaleX: 0,
                ease: Back.easeIn
            }, "-=0.3")
            .set($bar1, {
                rotation: 0,
                y: 0
            })
            .set($bar2, {
                scaleX: 0,
                opacity: 1
            })
            .set($bar3, {
                rotation: 0,
                y: 0
            })
            .to($bar2, 0.5, {
                scaleX: 1,
                ease: Elastic.easeOut
            })
            .to($bar1, 0.5, {
                scaleX: 1,
                ease: Elastic.easeOut
            }, "-=0.4")
            .to($bar3, 0.5, {
                scaleX: 1,
                ease: Elastic.easeOut,
                onComplete: function () {
                    isChangingState = false;
                    isOpen = false;
                }
            }, "-=0.5");
    }



    $burger.on('click', function (e) {

        if (!isChangingState) {
            isChangingState = true;

            if (!isOpen) {
                showCloseBurger();
                navbar.classList.toggle('active');
            } else {
                showOpenBurger();
                navbar.classList.toggle('active');
            }
        }

    });



      




    $(window).resize(function () {
        if ($(window).width() > 767 && !isChangingState) {
            showOpenBurger();
            navbar.classList.remove('active');
        }
    });

    

    $burger.hover(burgerOver, burgerOut);

});

console.clear();