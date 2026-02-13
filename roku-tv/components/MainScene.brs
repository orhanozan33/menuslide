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
    displayUrl = layout.displayUrl
    if displayUrl = invalid then displayUrl = layout.displayurl
    if displayUrl = invalid or (type(displayUrl) = "roString" and displayUrl.trim() = "") then
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
    if data.videoUrls <> invalid and data.videoUrls.count() > 0 then
        layout.displayUrl = data.videoUrls[0]
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
    renderLayout(layout)
end sub

function isVideoUrl(url as dynamic) as boolean
    if url = invalid or type(url) <> "roString" then return false
    u = url.trim()
    n = Len(u)
    if n < 4 then return false
    return (n >= 5 and Mid(u, n - 4, 5) = ".m3u8") or (Mid(u, n - 3, 4) = ".mp4")
end function

function isHlsUrl(url as dynamic) as boolean
    if url = invalid or type(url) <> "roString" then return false
    u = url.trim()
    n = Len(u)
    return n >= 5 and Mid(u, n - 4, 5) = ".m3u8"
end function

sub setVideoContentAndPlay(url as string)
    m.currentVideoUrl = url
    m.status.visible = false
    m.video.visible = true
    videoContent = createObject("roSGNode", "ContentNode")
    videoContent.url = url
    if isHlsUrl(url) then
        videoContent.streamFormat = "hls"
        videoContent.live = true
    else
        videoContent.streamFormat = "mp4"
    end if
    m.video.content = videoContent
    m.video.control = "play"
    m.video.observeField("state", "onVideoState")
end sub

function isPlaceholderStreamUrl(url as dynamic) as boolean
    if url = invalid or type(url) <> "roString" then return false
    u = LCase(Trim(url))
    return (Instr(1, u, "cdn.menuslide.com") > 0 and Instr(1, u, ".m3u8") > 0)
end function

function slugFromPlaceholderStreamUrl(url as string) as string
    if url = invalid or type(url) <> "roString" then return ""
    u = LCase(Trim(url))
    prefix = "cdn.menuslide.com/stream/"
    i = Instr(1, u, prefix)
    if i < 1 then return ""
    rest = Mid(u, i + Len(prefix), 999)
    j = Instr(1, rest, ".m3u8")
    if j < 1 then return rest
    return Left(rest, j - 1)
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
            setVideoContentAndPlay(displayUrl)
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
            setVideoContentAndPlay(videoUrl)
            hasVideo = true
        else
            m.status.text = "Loading. Please Wait."
        end if
    else if layoutType = "components" and layoutComps <> invalid
        for each comp in layoutComps
            ctype = comp.type
            if ctype = invalid then ctype = comp.Type
            vurl = comp.videoUrl
            if vurl = invalid then vurl = comp.videourl
            if ctype = "video" and vurl <> invalid then
                setVideoContentAndPlay(vurl)
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
        m.status.text = "Set Stream URL In Admin For Video."
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
    if state = "finished" then
        m.video.control = "play"
        return
    end if
    if state = "error" then
        errCode = m.video.errorCode
        errStr = m.video.errorStr
        if errStr = invalid then errStr = m.video.errorMsg
        print "[Video] Playback error. errorCode=" ; errCode ; " errorStr=" ; errStr
        url = m.currentVideoUrl
        print "[Video] currentVideoUrl=" ; url ; " isPlaceholder=" ; isPlaceholderStreamUrl(url)
        if url <> invalid and (errCode = -1 or errCode = -3) and isPlaceholderStreamUrl(url) then
            slug = slugFromPlaceholderStreamUrl(url)
            print "[Video] slug extracted: " ; slug
            if slug <> "" then
                renderUrl = "https://menuslide.com/api/render/" + slug
                print "[Video] Placeholder stream (404/yok), ekran goruntusune geciliyor: " ; renderUrl
                m.video.control = "stop"
                m.video.content = invalid
                m.video.visible = false
                m.mainImageDisplay.uri = renderUrl
                m.mainImageDisplay.visible = true
                m.status.visible = false
                startHeartbeat()
                return
            end if
        end if
        if errCode = -3 or errCode = -5 then
            print "[Video] SSL/sertifika hatasi olabilir (errorCode " ; errCode ; "). CDN sertifikasi gecerli olmali."
        end if
        if m.videoRetryCount = invalid then m.videoRetryCount = 0
        m.videoRetryCount = m.videoRetryCount + 1
        m.status.text = "Content Is Being Prepared. Please Wait."
        m.status.visible = true
        m.timer = CreateObject("roSGNode", "Timer")
        m.timer.duration = 5
        m.timer.repeat = false
        m.timer.observeField("fire", "retryVideo")
        m.timer.control = "start"
    end if
end sub

sub retryVideo()
    if m.timer <> invalid then m.timer.unobserveField("fire")
    m.timer = invalid
    if m.videoRetryCount <> invalid and m.videoRetryCount >= 2 then
        m.videoRetryCount = 0
        m.status.text = "Loading. Please Wait."
        startLayoutFetch()
        return
    end if
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
