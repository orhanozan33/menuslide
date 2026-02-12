sub init()
    m.video = m.top.findNode("video")
    m.bg = m.top.findNode("bg")
    m.status = m.top.findNode("status")
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceToken = m.sec.read("deviceToken")
    m.layoutStr = m.sec.read("layout")
    m.refreshInterval = 300
    r = m.sec.read("refreshInterval")
    if r <> "" then m.refreshInterval = Val(r, 10)
    if m.deviceToken = "" or m.deviceToken = invalid
        m.status.text = "Not activated. Restart channel."
        return
    end if
    loadLayout()
end sub

sub loadLayout()
    layout = invalid
    if m.layoutStr <> "" and m.layoutStr <> invalid
        layout = ParseJson(m.layoutStr)
    end if
    if layout = invalid
        layout = fetchLayout()
    end if
    if layout = invalid
        m.status.text = "Cannot load layout. Check network."
        return
    end if
    renderLayout(layout)
end sub

function fetchLayout() as object
    json = ApiLayout(m.deviceToken)
    if json = invalid then return invalid
    layout = json.layout
    if layout <> invalid
        m.sec.write("layout", FormatJson(layout))
        m.sec.flush()
    end if
    return layout
end function

sub renderLayout(layout as object)
    if layout = invalid then return
    type = layout.type
    if type = "video"
        videoUrl = layout.videoUrl
        if videoUrl <> invalid and videoUrl <> ""
            m.status.visible = false
            m.video.visible = true
            m.video.content = createObject("roSGNode", "ContentNode")
            m.video.content.url = videoUrl
            m.video.content.streamFormat = "hls"
            m.video.control = "play"
            m.video.observeField("state", "onVideoState")
        else
            m.status.text = "No video URL in layout."
        end if
    else if layout.components <> invalid
        for each comp in layout.components
            if comp.type = "video" and comp.videoUrl <> invalid
                m.status.visible = false
                m.video.visible = true
                m.video.content = createObject("roSGNode", "ContentNode")
                m.video.content.url = comp.videoUrl
                m.video.content.streamFormat = "hls"
                m.video.control = "play"
                m.video.observeField("state", "onVideoState")
                exit for
            end if
        end for
    end if
    startHeartbeat()
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
    m.heartbeatTimer = CreateObject("roSGNode", "Timer")
    m.heartbeatTimer.duration = m.refreshInterval
    m.heartbeatTimer.repeat = true
    m.heartbeatTimer.observeField("fire", "onHeartbeat")
    m.heartbeatTimer.control = "start"
end sub

sub onHeartbeat()
    ApiHeartbeat(m.deviceToken)
end sub
