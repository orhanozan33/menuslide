' Roku Digital Signage - JSON layout only. No video/HLS. SceneGraph slides (Poster + Label + Timer).

sub init()
    m.bg = m.top.findNode("bg")
    m.status = m.top.findNode("status")
    m.layoutGroup = m.top.findNode("layoutGroup")
    m.currentSlidePoster = m.top.findNode("currentSlidePoster")
    m.nextSlidePoster = m.top.findNode("nextSlidePoster")
    m.fadeIn = m.top.findNode("fadeIn")
    m.slideLeftAnim = m.top.findNode("slideLeft")
    if m.slideLeftAnim <> invalid then m.slideLeftAnim.observeField("state", "onSlideLeftDone")
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceToken = m.sec.read("deviceToken")
    m.layoutStr = m.sec.read("layout")
    m.layoutVersion = m.sec.read("layoutVersion")
    m.refreshInterval = 300
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

sub loadLayout()
    layout = invalid
    if m.top.layout <> invalid then
        layout = m.top.layout
    else if m.layoutStr <> "" and m.layoutStr <> invalid then
        layout = ParseJson(m.layoutStr)
    end if
    if layout = invalid then
        startLayoutFetch()
        return
    end if
    slides = layout.slides
    if slides = invalid then slides = layout.Slides
    if slides = invalid or slides.count() = 0 then
        startLayoutFetch()
        return
    end if
    renderLayout(layout)
end sub

sub startLayoutFetch()
    task = m.top.createChild("LayoutTask")
    task.input = { deviceToken: m.deviceToken }
    task.observeField("result", "onLayoutResult")
    task.control = "RUN"
end sub

sub onLayoutResult(msg as dynamic)
    data = msg.getData()
    if data = invalid or data.error <> invalid then
        if m.layoutFetchFailCount = invalid then m.layoutFetchFailCount = 0
        m.layoutFetchFailCount = m.layoutFetchFailCount + 1
        m.status.text = "Loading. Please Wait."
        if m.layoutFetchFailCount >= 2 and (m.layoutStr = "" or m.layoutStr = invalid) then
            m.top.requestShowCode = true
        end if
        return
    end if
    m.layoutFetchFailCount = 0
    layout = data.layout
    if layout = invalid then
        m.status.text = "Loading. Please Wait."
        return
    end if
    m.sec.write("layout", FormatJson(layout))
    versionChanged = (data.layoutVersion <> invalid and data.layoutVersion <> "" and data.layoutVersion <> m.layoutVersion)
    if data.layoutVersion <> invalid and data.layoutVersion <> "" then
        m.layoutVersion = data.layoutVersion
        m.sec.write("layoutVersion", m.layoutVersion)
    end if
    if data.refreshIntervalSeconds <> invalid and data.refreshIntervalSeconds > 0 then
        m.refreshInterval = data.refreshIntervalSeconds
        m.sec.write("refreshInterval", Str(m.refreshInterval))
    end if
    m.sec.flush()
    ' Only re-render when version changed so we don't reset to slide 0 every poll
    if versionChanged then
        renderLayout(layout)
    end if
end sub

sub renderLayout(layout as object)
    if layout = invalid then return
    m.slides = invalid
    if m.slideTimer <> invalid then m.slideTimer.control = "stop"
    m.slideTimer = invalid
    m.currentSlidePoster.visible = false
    m.currentSlidePoster.uri = ""
    m.nextSlidePoster.visible = false
    m.nextSlidePoster.uri = ""
    clearLayoutGroup()
    if layout.backgroundColor <> invalid and layout.backgroundColor <> "" then
        m.bg.color = hexToRokuColor(layout.backgroundColor)
    end if
    slides = layout.slides
    if slides = invalid then slides = layout.Slides
    if slides <> invalid and slides.count() > 0 then
        m.slides = slides
        m.slideIndex = 0
        showSlide(0)
        preloadNextImage()
        startSlideTimer()
        m.status.visible = false
    else
        m.status.text = "No content. Add templates in Admin."
        m.status.visible = true
    end if
    startHeartbeat()
end sub

function getTransitionSec(slide as object) as float
    td = slide.transition_duration
    if td = invalid then td = slide.transition_duration
    if td = invalid or td < 100 then return 0.3
    return td / 1000.0
end function

function getTransitionEffect(slide as object) as string
    te = slide.transition_effect
    if te = invalid then te = slide.transition_effect
    if te = invalid then return "fade"
    return te
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
            transitionEffect = getTransitionEffect(slide)
            transitionSec = getTransitionSec(slide)
            if m.fadeIn <> invalid and transitionEffect = "fade" and transitionSec > 0 then
                m.currentSlidePoster.opacity = 0
                m.fadeIn.duration = transitionSec
                m.fadeIn.control = "start"
            end if
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
    slide = m.slides[m.slideIndex]
    dur = slide.duration
    if dur = invalid then dur = slide.Duration
    if dur = invalid or dur < 1 then dur = 8
    if m.slideTimer <> invalid then m.slideTimer.control = "stop"
    m.slideTimer = CreateObject("roSGNode", "Timer")
    m.slideTimer.duration = dur
    m.slideTimer.repeat = false
    m.slideTimer.observeField("fire", "onSlideTimerFire")
    m.slideTimer.control = "start"
end sub

sub onSlideTimerFire()
    nextIndex = m.slideIndex + 1
    if nextIndex >= m.slides.count() then nextIndex = 0
    nextSlide = m.slides[nextIndex]
    nextType = nextSlide.type
    if nextType = invalid then nextType = nextSlide.Type
    if nextType = "image" and getTransitionEffect(nextSlide) = "slide-left" and m.slideLeftAnim <> invalid then
        m.slideTimer.control = "stop"
        clearLayoutGroup()
        m.pendingNextIndex = nextIndex
        m.nextSlidePoster.uri = nextSlide.url
        if m.nextSlidePoster.uri = invalid then m.nextSlidePoster.uri = nextSlide.Url
        m.nextSlidePoster.visible = true
        m.nextSlidePoster.translation = [1920, 0]
        m.slideLeftAnim.duration = getTransitionSec(nextSlide)
        m.slideLeftAnim.control = "start"
    else
        showSlide(nextIndex)
        preloadNextImage()
        startSlideTimer()
    end if
end sub

sub onSlideLeftDone()
    if m.slideLeftAnim = invalid or m.slideLeftAnim.state <> "stopped" then return
    if m.pendingNextIndex = invalid then return
    nextIndex = m.pendingNextIndex
    m.pendingNextIndex = invalid
    m.slideIndex = nextIndex
    m.currentSlidePoster.uri = m.nextSlidePoster.uri
    m.currentSlidePoster.translation = [0, 0]
    m.nextSlidePoster.visible = false
    m.nextSlidePoster.translation = [1920, 0]
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

sub startHeartbeat()
    if m.heartbeatTimer <> invalid then return
    m.heartbeatTimer = CreateObject("roSGNode", "Timer")
    m.heartbeatTimer.duration = m.refreshInterval
    m.heartbeatTimer.repeat = true
    m.heartbeatTimer.observeField("fire", "onHeartbeat")
    m.heartbeatTimer.control = "start"
end sub

sub onHeartbeat()
    task = m.top.createChild("HeartbeatTask")
    task.input = { deviceToken: m.deviceToken }
    task.observeField("result", "onHeartbeatResult")
    task.control = "RUN"
    startLayoutFetch()
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
    data = msg.getData()
    if data = invalid or data.error <> invalid then return
    if data.layoutVersion <> invalid and data.layoutVersion <> "" and data.layoutVersion <> m.layoutVersion then
        startLayoutFetch()
    end if
end sub
