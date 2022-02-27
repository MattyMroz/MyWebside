// =============== NAVBAR, NAVLIKNS, BURGER MENU AND SCROLL ===============
$(function () {
    var $html = $('html');
    var $header = $('.header');
    var $navbar = $('.navbar');
    var $navLink = $('.nav__link');
    var $burger = $('.burger');
    var $bar1 = $('.burger-svg__bar-1');
    var $bar2 = $('.burger-svg__bar-2');
    var $bar3 = $('.burger-svg__bar-3');
    var isChangingState = false;
    var isOpen = false;
    var burgerTL = new TimelineMax();

    // ========== Burger Animations ==========
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

    // ========== Burger Hover ==========
    $burger.hover(burgerOver, burgerOut);

    // ========== Burger On Click ==========
    $burger.on('click', function (e) {
        if (!isChangingState) {
            isChangingState = true;

            if (!isOpen) {
                showCloseBurger();
                $navbar.addClass('active');
                $html.addClass('no__scroll');
            } else {
                showOpenBurger();
                $navbar.removeClass('active');
                $html.removeClass('no__scroll');
            }
        }

    });

    // ========== NavLink On Click ==========
    $navLink.on('click', function (e) {
        if ($navbar.hasClass('active')) {
            if (!isChangingState) {
                isChangingState = true;
                if (isOpen) {
                    showOpenBurger();
                    $navbar.removeClass('active');
                    $html.removeClass('no__scroll');
                }
            }
        }
    });

    // ========== Resize ==========
    $(window).resize(function (e) {
        if ($(window).width() != 0 && !isChangingState) {
            isChangingState = true;
            showOpenBurger();
            $navbar.removeClass('active');
            $html.removeClass('no__scroll');
        }
    });

    // ========== Header Scroll Animation ==========
    $(window).scroll(function () {
        if ($(window).scrollTop() > 0) {
            $header.addClass('header__scroll');
        } else {
            $header.removeClass('header__scroll');
        }
    });

    // ========== Scroll To ==========
    $navLink.on('click', function (e) {
        e.preventDefault();
        var $this = $(this);
        var $target = $($this.attr('href'));
        var targetOffset = $target.offset().top;
        var headerHeight = $header.outerHeight();
        var scrollTo = targetOffset - headerHeight;

        $('html, body').animate({
            scrollTop: scrollTo
        }, 500);
    });


    // ========== Scroll Trigger Animation scroll ==========


});

// =============== DARKMODE ===============
$(function () {
    var $html = document.documentElement;
    var $toogleBtn = $('.toggle__btn');
    var $currentTheme = localStorage.getItem('dark__mod');
    if ($currentTheme) {
        $html.classList.add($currentTheme);
    }
    $toogleBtn.on('click', function (e) {
        $html.classList.toggle('dark__mode');
        if ($html.classList.contains('dark__mode')) {
            localStorage.setItem('dark__mod', 'dark__mode');
        } else {
            localStorage.setItem('dark__mod', 'light__mode');
        }
    });
});




// ========== Scroll Trigger ============
