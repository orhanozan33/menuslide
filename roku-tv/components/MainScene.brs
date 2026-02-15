' Roku Digital Signage - JSON layout only. No video/HLS. SceneGraph slides (Poster + Label + Timer).

sub init()
    m.bg = m.top.findNode("bg")
    m.status = m.top.findNode("status")
    m.layoutGroup = m.top.findNode("layoutGroup")
    m.currentSlidePoster = m.top.findNode("currentSlidePoster")
    m.nextSlidePoster = m.top.findNode("nextSlidePoster")
    m.fadeIn = m.top.findNode("fadeIn")
    m.slideLeftAnim = m.top.findNode("slideLeft")
    m.slideRightAnim = m.top.findNode("slideRight")
    m.fadeTransition = m.top.findNode("fadeTransition")
    m.slideTimer = m.top.findNode("slideTimer")
    if m.slideTimer <> invalid then m.slideTimer.observeField("fire", "onSlideTimerFire")
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceToken = m.sec.read("deviceToken")
    m.layoutStr = m.sec.read("layout")
    m.layoutVersion = m.sec.read("layoutVersion")
    m.refreshInterval = 30
    r = m.sec.read("refreshInterval")
    if r <> "" and r <> invalid then m.refreshInterval = Int(Val(r))
    if m.deviceToken = "" or m.deviceToken = invalid then
        m.status.text = "Not activated. Restart channel."
        m.status.visible = true
        m.top.requestShowCode = true
        return
    end if
    m.top.observeField("layout", "onLayoutPassed")
    loadLayout()
end sub

sub onLayoutPassed()
    layout = m.top.layout
    if layout <> invalid then
        m.sec.write("layout", FormatJson(layout))
        m.sec.flush()
        renderLayout(layout)
    end if
end sub

function getSlidesFromLayout(layout as object) as dynamic
    if layout = invalid then return invalid
    slides = layout.slides
    if slides = invalid then slides = layout.Slides
    if slides = invalid then slides = layout.Lookup("slides")
    return slides
end function

' Registry'de slide bazinda saklanan layout'u oku (kesilme olmasin)
function loadLayoutFromChunkedRegistry() as dynamic
    cntStr = m.sec.read("layout_slide_count")
    if cntStr = "" or cntStr = invalid then return invalid
    cnt = Int(Val(cntStr))
    if cnt < 1 then return invalid
    slides = CreateObject("roArray", cnt, true)
    for i = 0 to cnt - 1
        s = m.sec.read("layout_slide_" + Stri(i))
        if s <> "" and s <> invalid then
            slide = ParseJson(s)
            if slide <> invalid then slides.push(slide)
        end if
    end for
    if slides.count() <> cnt then return invalid
    layout = CreateObject("roAssociativeArray")
    layout.slides = slides
    layout.backgroundColor = m.sec.read("layout_bg")
    if layout.backgroundColor = invalid or layout.backgroundColor = "" then layout.backgroundColor = "#000000"
    layout.version = m.sec.read("layout_ver")
    return layout
end function

sub loadLayout()
    layout = invalid
    if m.top.layout <> invalid then
        layout = m.top.layout
    else
        layout = loadLayoutFromChunkedRegistry()
        slidesFromChunked = getSlidesFromLayout(layout)
        if layout = invalid or slidesFromChunked = invalid or slidesFromChunked.count() < 1 then
            if m.layoutStr <> "" and m.layoutStr <> invalid then
                layout = ParseJson(m.layoutStr)
            end if
        end if
    end if
    if layout = invalid then
        m.status.text = "Loading. Please Wait."
        m.status.visible = true
        startLayoutFetch()
        return
    end if
    slides = getSlidesFromLayout(layout)
    if slides = invalid or slides.count() = 0 then
        m.status.text = "Loading. Please Wait."
        m.status.visible = true
        startLayoutFetch()
        return
    end if
    if slides.count() < 1 then
        m.status.text = "Loading. Please Wait."
        m.status.visible = true
        startLayoutFetch()
        return
    end if
    ' Always fetch on startup to get latest layout - prevent stale template
    renderLayout(layout)
    startLayoutFetch()
end sub

sub startLayoutFetch()
    task = m.top.createChild("LayoutTask")
    task.id = "LayoutTask"
    task.input = { deviceToken: m.deviceToken }
    task.observeField("result", "onLayoutResult")
    task.control = "RUN"
end sub

sub onLayoutResult(msg as dynamic)
    taskNode = msg.getRoSGNode()
    data = msg.getData()
    if data = invalid or data.error <> invalid then
        if m.layoutFetchFailCount = invalid then m.layoutFetchFailCount = 0
        m.layoutFetchFailCount = m.layoutFetchFailCount + 1
        m.status.text = "Loading. Please Wait."
        if m.slides = invalid or m.slides.count() = 0 then m.status.visible = true
        ' Ag hatasi: once chunked cache, yoksa layout string
        layout = loadLayoutFromChunkedRegistry()
        if layout = invalid and m.layoutStr <> "" and m.layoutStr <> invalid then layout = ParseJson(m.layoutStr)
        slides = getSlidesFromLayout(layout)
        if layout <> invalid and slides <> invalid and slides.count() > 0 then
            renderLayout(layout)
        end if
        if m.layoutFetchFailCount >= 2 and (m.layoutStr = "" or m.layoutStr = invalid) then
            m.top.requestShowCode = true
        end if
        removeLayoutTask(taskNode)
        return
    end if
    m.layoutFetchFailCount = 0
    if data.ok = true then
        layout = loadLayoutFromChunkedRegistry()
        if layout <> invalid then
            m.layoutVersion = m.sec.read("layoutVersion")
            if m.layoutVersion = invalid then m.layoutVersion = ""
            print "[MainScene] layout from registry version="; m.layoutVersion
            r = m.sec.read("refreshInterval")
            if r <> "" and r <> invalid then m.refreshInterval = Int(Val(r))
            renderLayout(layout)
        else
            m.status.text = "Loading. Please Wait."
            m.status.visible = true
        end if
        removeLayoutTask(taskNode)
        return
    end if
    layout = data.layout
    if layout = invalid then layout = data.Layout
    if layout = invalid then layout = data.Lookup("layout")
    if layout = invalid then
        m.status.text = "Loading. Please Wait."
        m.status.visible = true
        removeLayoutTask(taskNode)
        return
    end if
    m.sec.write("layout", FormatJson(layout))
    newVer = ""
    if data.layoutVersion <> invalid and data.layoutVersion <> "" then newVer = data.layoutVersion
    curVer = m.layoutVersion
    if curVer = invalid then curVer = ""
    versionChanged = (newVer <> "" and newVer <> curVer)
    print "[MainScene] layoutVersion cur="; curVer; " new="; newVer; " changed="; versionChanged
    if data.layoutVersion <> invalid and data.layoutVersion <> "" then
        m.layoutVersion = data.layoutVersion
        m.sec.write("layoutVersion", m.layoutVersion)
    end if
    if data.refreshIntervalSeconds <> invalid and data.refreshIntervalSeconds > 0 then
        m.refreshInterval = data.refreshIntervalSeconds
        m.sec.write("refreshInterval", Str(m.refreshInterval))
    end if
    m.sec.flush()
    needRender = (m.slides = invalid or m.slides.count() = 0) or versionChanged
    if needRender then
        renderLayout(layout)
    end if
    removeLayoutTask(taskNode)
end sub

sub removeLayoutTask(taskNode as dynamic)
    if taskNode <> invalid then
        taskNode.unobserveField("result")
        m.top.removeChild(taskNode)
    end if
end sub

sub renderLayout(layout as object)
    if layout = invalid then return
    slides = getSlidesFromLayout(layout)
    if slides = invalid or slides.count() = 0 then
        m.slides = invalid
        if m.slideTimer <> invalid then m.slideTimer.control = "stop"
        m.status.text = "No content. Add templates in Admin."
        m.status.visible = true
        startHeartbeat()
        return
    end if
    if m.slideTimer <> invalid then m.slideTimer.control = "stop"
    m.currentSlidePoster.visible = false
    m.currentSlidePoster.uri = ""
    m.nextSlidePoster.visible = false
    m.nextSlidePoster.uri = ""
    clearLayoutGroup()
    if layout.backgroundColor <> invalid and layout.backgroundColor <> "" then
        m.bg.color = hexToRokuColor(layout.backgroundColor)
    end if
    m.slides = slides
    ' Re-render (version change): keep current position so all slides keep rotating; don't jump back to 0
    startIndex = 0
    if m.slideIndex <> invalid and m.slideIndex >= 0 then
        if m.slideIndex < slides.count() then
            startIndex = m.slideIndex
        else
            startIndex = 0
        end if
    end if
    m.slideIndex = startIndex
    showSlide(startIndex)
    preloadNextImage()
    startSlideTimer()
    m.status.visible = false
    startHeartbeat()
    startKeepAlive()
end sub

function getTransitionSec(slide as object) as float
    td = slide.Lookup("transition_duration")
    if td = invalid then td = slide.Lookup("transitionDuration")
    if td = invalid then return 0.8
    num = Val(Str(td))
    if num < 100 then return 0.8
    return num / 1000.0
end function

function getTransitionEffect(slide as object) as string
    te = slide.Lookup("transition_effect")
    if te = invalid then te = slide.Lookup("transitionEffect")
    if te = invalid then return "fade"
    ' roString from ParseJson - compare directly (avoid Str/Trim/LCase Type Mismatch)
    if te = "slide-left" or te = "slideleft" or te = "slide_left" then return "slide-left"
    if te = "slide-right" or te = "slideright" or te = "slide_right" then return "slide-right"
    if te = "fade" or te = "crossfade" then return "fade"
    return "fade"
end function

sub showSlide(index as integer)
    if m.slides = invalid or m.slides.count() = 0 then return
    if index < 0 or index >= m.slides.count() then index = 0
    m.slideIndex = index
    slide = m.slides[index]
    clearLayoutGroup()
    m.currentSlidePoster.visible = false
    m.currentSlidePoster.uri = ""
    m.currentSlidePoster.translation = [0, 0]
    m.nextSlidePoster.visible = false
    m.nextSlidePoster.translation = [1920, 0]
    slideType = slide.type
    if slideType = invalid then slideType = slide.Type
    if slideType = "image" then
        url = slide.url
        if url = invalid then url = slide.Url
        if url <> invalid and url <> "" then
            m.currentSlidePoster.uri = url
            m.currentSlidePoster.visible = true
            m.currentSlidePoster.opacity = 1
        else
            m.status.text = "No image URL."
            m.status.visible = true
        end if
    else
        ' text slide
        title = slide.title
        if title = invalid then title = slide.Title
        if title = invalid then title = ""
        desc = slide.description
        if desc = invalid then desc = slide.Description
        if desc = invalid then desc = ""
        m.currentSlidePoster.visible = false
        if title <> "" then
            lab = m.layoutGroup.createChild("Label")
            lab.translation = [80, 200]
            lab.width = 1760
            lab.height = 120
            lab.text = title
            lab.color = &hFFFFFFFF
            fontNode = CreateObject("roSGNode", "Font")
            fontNode.size = 56
            lab.font = fontNode
        end if
        if desc <> "" then
            lab2 = m.layoutGroup.createChild("Label")
            lab2.translation = [80, 340]
            lab2.width = 1760
            lab2.height = 400
            lab2.text = desc
            lab2.color = &hCCCCCCFF
            fontNode2 = CreateObject("roSGNode", "Font")
            fontNode2.size = 36
            lab2.font = fontNode2
        end if
    end if
end sub

sub preloadNextImage()
    if m.slides = invalid or m.slides.count() = 0 then return
    nextIndex = m.slideIndex + 1
    if nextIndex >= m.slides.count() then nextIndex = 0
    nextSlide = m.slides[nextIndex]
    nextType = nextSlide.type
    if nextType = invalid then nextType = nextSlide.Type
    if nextType = "image" then
        url = nextSlide.url
        if url = invalid then url = nextSlide.Url
        if url <> invalid and url <> "" then
            m.nextSlidePoster.uri = url
        end if
    end if
end sub

sub startSlideTimer()
    if m.slides = invalid or m.slides.count() = 0 then return
    print "[MainScene] startSlideTimer slideIndex="; m.slideIndex; " dur="; m.slideTimer.duration
    if m.slideTimer = invalid then return
    slide = m.slides[m.slideIndex]
    dur = slide.duration
    if dur = invalid then dur = slide.Duration
    if dur = invalid then dur = 8
    dur = Int(Val(Str(dur)))
    if dur < 1 then dur = 8
    m.slideTimer.control = "stop"
    m.slideTimer.duration = dur
    m.slideTimer.repeat = false
    m.slideTimer.control = "start"
end sub

sub onSlideTimerFire()
    print "[MainScene] onSlideTimerFire slideIndex="; m.slideIndex
    nextIndex = m.slideIndex + 1
    if nextIndex >= m.slides.count() then nextIndex = 0
    nextSlide = m.slides[nextIndex]
    nextType = nextSlide.type
    if nextType = invalid then nextType = nextSlide.Type
    effect = getTransitionEffect(nextSlide)
    if nextType = "image" and effect = "slide-left" and m.slideLeftAnim <> invalid then
        m.slideTimer.control = "stop"
        clearLayoutGroup()
        m.pendingNextIndex = nextIndex
        m.pendingTransitionType = "slide-left"
        m.nextSlidePoster.uri = nextSlide.url
        if m.nextSlidePoster.uri = invalid then m.nextSlidePoster.uri = nextSlide.Url
        m.nextSlidePoster.visible = true
        m.nextSlidePoster.translation = [1920, 0]
        m.nextSlidePoster.opacity = 1
        m.slideLeftAnim.duration = getTransitionSec(nextSlide)
        m.slideLeftAnim.control = "stop"
        m.slideLeftAnim.control = "start"
        startTransitionFallback(getTransitionSec(nextSlide))
    else if nextType = "image" and effect = "slide-right" and m.slideRightAnim <> invalid then
        m.slideTimer.control = "stop"
        clearLayoutGroup()
        m.pendingNextIndex = nextIndex
        m.pendingTransitionType = "slide-right"
        m.nextSlidePoster.uri = nextSlide.url
        if m.nextSlidePoster.uri = invalid then m.nextSlidePoster.uri = nextSlide.Url
        m.nextSlidePoster.visible = true
        m.nextSlidePoster.translation = [-1920, 0]
        m.nextSlidePoster.opacity = 1
        m.slideRightAnim.duration = getTransitionSec(nextSlide)
        m.slideRightAnim.control = "stop"
        m.slideRightAnim.control = "start"
        startTransitionFallback(getTransitionSec(nextSlide))
    else if nextType = "image" and effect = "fade" and m.fadeTransition <> invalid then
        m.slideTimer.control = "stop"
        m.pendingNextIndex = nextIndex
        m.pendingTransitionType = "fade"
        m.nextSlidePoster.uri = nextSlide.url
        if m.nextSlidePoster.uri = invalid then m.nextSlidePoster.uri = nextSlide.Url
        m.nextSlidePoster.opacity = 0
        m.nextSlidePoster.translation = [0, 0]
        m.nextSlidePoster.visible = true
        m.fadeTransition.duration = getTransitionSec(nextSlide)
        m.fadeTransition.control = "stop"
        m.fadeTransition.control = "start"
        startTransitionFallback(getTransitionSec(nextSlide))
    else
        showSlide(nextIndex)
        preloadNextImage()
        startSlideTimer()
    end if
end sub

sub startTransitionFallback(animSec as float)
    stopTransitionFallback()
    d = animSec + 1.0
    if d < 2.0 then d = 2.0
    t = m.top.createChild("Timer")
    t.duration = d
    t.repeat = false
    t.observeField("fire", "onTransitionFallbackFire")
    t.control = "start"
    m.transitionFallbackTimer = t
end sub

sub stopTransitionFallback()
    if m.transitionFallbackTimer <> invalid then
        m.transitionFallbackTimer.control = "stop"
        m.transitionFallbackTimer.unobserveField("fire")
        m.top.removeChild(m.transitionFallbackTimer)
        m.transitionFallbackTimer = invalid
    end if
end sub

sub onTransitionFallbackFire()
    if m.pendingNextIndex = invalid then return
    finishTransition()
end sub

sub finishTransition()
    print "[MainScene] finishTransition nextIndex="; m.pendingNextIndex
    stopTransitionFallback()
    if m.pendingNextIndex = invalid then return
    nextIndex = m.pendingNextIndex
    m.pendingNextIndex = invalid
    tt = m.pendingTransitionType
    if tt = invalid then tt = "slide-left"
    m.pendingTransitionType = invalid
    m.slideIndex = nextIndex
    m.currentSlidePoster.uri = m.nextSlidePoster.uri
    m.currentSlidePoster.translation = [0, 0]
    m.currentSlidePoster.opacity = 1
    m.nextSlidePoster.visible = false
    if tt = "slide-left" then
        m.nextSlidePoster.translation = [1920, 0]
    else if tt = "slide-right" then
        m.nextSlidePoster.translation = [-1920, 0]
    else
        m.nextSlidePoster.opacity = 0
    end if
    preloadNextImage()
    startSlideTimer()
end sub

sub clearLayoutGroup()
    if m.layoutGroup = invalid then return
    while m.layoutGroup.getChildCount() > 0
        m.layoutGroup.removeChildIndex(0)
    end while
end sub

function hexToRokuColor(hex as string) as integer
    s = hex
    if Left(s, 1) = "#" then s = Mid(s, 2)
    if Len(s) = 6 then s = s + "FF"
    if Len(s) <> 8 then return &h000000FF
    return Val("&h" + s)
end function

sub stopHeartbeat()
    if m.heartbeatTimer <> invalid then
        m.heartbeatTimer.control = "stop"
        m.heartbeatTimer.unobserveField("fire")
        m.top.removeChild(m.heartbeatTimer)
        m.heartbeatTimer = invalid
    end if
end sub

sub startHeartbeat()
    stopHeartbeat()
    dur = m.refreshInterval
    if dur < 5 then dur = 15
    m.heartbeatTimer = m.top.createChild("Timer")
    m.heartbeatTimer.duration = dur
    m.heartbeatTimer.repeat = true
    m.heartbeatTimer.observeField("fire", "onHeartbeat")
    m.heartbeatTimer.control = "start"
end sub

' Ekran koruyucuyu onlemek icin periyodik tuş simülasyonu (ECP localhost)
sub startKeepAlive()
    if m.keepAliveTimer <> invalid then return
    m.keepAliveTimer = m.top.createChild("Timer")
    m.keepAliveTimer.duration = 240
    m.keepAliveTimer.repeat = true
    m.keepAliveTimer.observeField("fire", "onKeepAliveFire")
    m.keepAliveTimer.control = "start"
end sub

sub onKeepAliveFire()
    ' roUrlTransfer must run on TASK thread, not RENDER thread (Timer callback runs on RENDER)
    task = m.top.createChild("KeepAliveTask")
    task.observeField("result", "onKeepAliveResult")
    task.control = "RUN"
end sub

sub onKeepAliveResult(msg as dynamic)
    taskNode = msg.getRoSGNode()
    if taskNode <> invalid then
        taskNode.unobserveField("result")
        m.top.removeChild(taskNode)
    end if
end sub

sub onHeartbeat()
    task = m.top.createChild("HeartbeatTask")
    task.id = "HeartbeatTask"
    task.input = { deviceToken: m.deviceToken }
    task.observeField("result", "onHeartbeatResult")
    task.control = "RUN"
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if LCase(key) = "back" then
        m.top.requestShowCode = true
        return true
    end if
    return false
end function

sub onHeartbeatResult(msg as dynamic)
    taskNode = msg.getRoSGNode()
    data = msg.getData()
    if data = invalid or data.error <> invalid then
        removeHeartbeatTask(taskNode)
        return
    end if
    if data.refreshIntervalSeconds <> invalid and data.refreshIntervalSeconds >= 5 then
        m.refreshInterval = data.refreshIntervalSeconds
        m.sec.write("refreshInterval", Str(m.refreshInterval))
        m.sec.flush()
    end if
    newVer = ""
    if data.layoutVersion <> invalid and data.layoutVersion <> "" then newVer = data.layoutVersion
    curVer = m.layoutVersion
    if curVer = invalid then curVer = ""
    if newVer <> "" and newVer <> curVer then
        startLayoutFetch()
    end if
    removeHeartbeatTask(taskNode)
end sub

sub removeHeartbeatTask(taskNode as dynamic)
    if taskNode <> invalid then
        taskNode.unobserveField("result")
        m.top.removeChild(taskNode)
    end if
end sub
