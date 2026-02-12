sub init()
    m.video = m.top.findNode("video")
    m.bg = m.top.findNode("bg")
    m.status = m.top.findNode("status")
    m.layoutGroup = m.top.findNode("layoutGroup")
    m.mainImageDisplay = m.top.findNode("mainImageDisplay")
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceToken = m.sec.read("deviceToken")
    m.layoutStr = m.sec.read("layout")
    m.layoutVersion = m.sec.read("layoutVersion")
    m.refreshInterval = 300
    r = m.sec.read("refreshInterval")
    if r <> "" and r <> invalid then m.refreshInterval = Int(Val(r))
    if m.deviceToken = "" or m.deviceToken = invalid
        m.status.text = "Not activated. Restart channel."
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
        m.status.text = "Cannot load layout. Check network."
        return
    end if
    layout = data.layout
    if layout = invalid then
        m.status.text = "Cannot load layout. Check network."
        return
    end if
    m.sec.write("layout", FormatJson(layout))
    if data.layoutVersion <> invalid and data.layoutVersion <> ""
        m.layoutVersion = data.layoutVersion
        m.sec.write("layoutVersion", m.layoutVersion)
    end if
    if data.refreshIntervalSeconds <> invalid and data.refreshIntervalSeconds > 0
        m.refreshInterval = data.refreshIntervalSeconds
        m.sec.write("refreshInterval", Str(m.refreshInterval))
    end if
    m.sec.flush()
    if data.videoUrls <> invalid and data.videoUrls.count() > 0 then
        layout.displayUrl = data.videoUrls[0]
    end if
    renderLayout(layout)
end sub

function isVideoUrl(url as dynamic) as boolean
    if url = invalid or type(url) <> "roString" then return false
    u = url.trim()
    n = Len(u)
    if n < 4 then return false
    return (n >= 5 and Mid(u, n - 4, 5) = ".m3u8") or (Mid(u, n - 3, 4) = ".mp4")
end function

sub renderLayout(layout as object)
    if layout = invalid then return
    m.slides = invalid
    if m.slideTimer <> invalid then m.slideTimer.control = "stop"
    m.slideTimer = invalid
    m.video.control = "stop"
    m.video.content = invalid
    if m.mainImageDisplay <> invalid then m.mainImageDisplay.visible = false
    clearLayoutGroup()
    if layout.backgroundColor <> invalid and layout.backgroundColor <> "" then
        m.bg.color = hexToRokuColor(layout.backgroundColor)
    end if
    displayUrl = layout.displayUrl
    if displayUrl = invalid then displayUrl = layout.displayurl
    if displayUrl <> invalid and displayUrl <> "" then
        if isVideoUrl(displayUrl) then
            m.status.visible = false
            m.video.visible = true
            m.video.content = createObject("roSGNode", "ContentNode")
            m.video.content.url = displayUrl
            m.video.content.streamFormat = "hls"
            m.video.control = "play"
            m.video.observeField("state", "onVideoState")
            startHeartbeat()
            return
        else
            m.mainImageDisplay.uri = displayUrl
            m.mainImageDisplay.visible = true
            m.video.visible = false
            m.status.visible = false
            startHeartbeat()
            return
        end if
    end if
    layoutType = layout.type
    if layoutType = invalid then layoutType = layout.Type
    layoutComps = layout.components
    if layoutComps = invalid then layoutComps = layout.Components
    hasVideo = false
    if layoutType = "video"
        videoUrl = layout.videoUrl
        if videoUrl = invalid then videoUrl = layout.videourl
        if videoUrl <> invalid and videoUrl <> ""
            m.status.visible = false
            m.video.visible = true
            m.video.content = createObject("roSGNode", "ContentNode")
            m.video.content.url = videoUrl
            m.video.content.streamFormat = "hls"
            m.video.control = "play"
            m.video.observeField("state", "onVideoState")
            hasVideo = true
        else
            m.status.text = "No video URL in layout."
        end if
    else if layoutType = "components" and layoutComps <> invalid
        for each comp in layoutComps
            ctype = comp.type
            if ctype = invalid then ctype = comp.Type
            vurl = comp.videoUrl
            if vurl = invalid then vurl = comp.videourl
            if ctype = "video" and vurl <> invalid then
                m.status.visible = false
                m.video.visible = true
                m.video.content = createObject("roSGNode", "ContentNode")
                m.video.content.url = vurl
                m.video.content.streamFormat = "hls"
                m.video.control = "play"
                m.video.observeField("state", "onVideoState")
                hasVideo = true
                exit for
            end if
        end for
        if not hasVideo then
            renderComponents(layoutComps)
            m.status.visible = false
        end if
    end if
    slides = layout.slides
    if slides = invalid then slides = layout.Slides
    if not hasVideo and slides <> invalid and slides.count() > 0 then
        m.slides = slides
        m.slideIndex = 0
        showSlide(0)
        m.status.visible = false
        startSlideTimer()
    else if not hasVideo and (layoutType <> "components" or layoutComps = invalid) then
        m.status.visible = true
        m.status.text = "Connected. Set stream URL (HLS/MP4) in Admin for video."
    end if
    startHeartbeat()
end sub

sub showSlide(index as integer)
    if m.slides = invalid or m.slides.count() = 0 then return
    if index < 0 or index >= m.slides.count() then index = 0
    m.slideIndex = index
    slide = m.slides[index]
    comps = slide.components
    if comps = invalid then comps = slide.Components
    clearLayoutGroup()
    if comps <> invalid then renderComponents(comps)
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
    showSlide(nextIndex)
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

sub renderComponents(components as object)
    if m.layoutGroup = invalid or components = invalid then return
    for each comp in components
        compType = comp.type
        if compType = invalid then compType = comp.Type
        x = 0
        if comp.x <> invalid then x = comp.x
        y = 0
        if comp.y <> invalid then y = comp.y
        w = 800
        if comp.width <> invalid then w = comp.width
        h = 80
        if comp.height <> invalid then h = comp.height
        if compType = "text" then
            node = m.layoutGroup.createChild("Label")
            node.translation = [x, y]
            node.width = w
            node.height = h
            txt = comp.text
            if txt = invalid then txt = comp.Text
            if txt <> invalid then node.text = txt
            clr = comp.textColor
            if clr = invalid then clr = comp.textcolor
            if clr = invalid then clr = comp.color
            if clr = invalid then clr = comp.Color
            if clr <> invalid then node.color = hexToRokuColor(clr) else node.color = &hFFFFFFFF
            fontSize = comp.fontSize
            if fontSize = invalid then fontSize = comp.fontsize
            if fontSize = invalid then fontSize = comp.textSize
            if fontSize = invalid then fontSize = comp.textsize
            if fontSize <> invalid and fontSize > 0 then
                fontNode = CreateObject("roSGNode", "Font")
                fontNode.size = fontSize
                node.font = fontNode
            end if
        else if compType = "image" then
            url = comp.url
            if url = invalid then url = comp.Url
            if url <> invalid and url <> "" then
                node = m.layoutGroup.createChild("Poster")
                node.translation = [x, y]
                node.width = w
                node.height = h
                node.uri = url
                node.loadDisplayMode = "scaleToFit"
            end if
        end if
    end for
end sub

sub onVideoState()
    state = m.video.state
    if state = "error"
        m.status.text = "Playback error. Retrying..."
        m.status.visible = true
        m.timer = CreateObject("roSGNode", "Timer")
        m.timer.duration = 5
        m.timer.repeat = false
        m.timer.observeField("fire", "retryVideo")
        m.timer.control = "start"
    end if
end sub

sub retryVideo()
    m.video.control = "play"
    m.status.visible = false
end sub

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

sub onHeartbeatResult(msg as dynamic)
    data = msg.getData()
    if data = invalid or data.error <> invalid then return
    if data.layoutVersion <> invalid and data.layoutVersion <> "" and data.layoutVersion <> m.layoutVersion then
        startLayoutFetch()
    end if
end sub
