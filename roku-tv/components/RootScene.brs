sub init()
    m.content = m.top.findNode("content")
    m.codeLabel = m.top.findNode("codeLabel")
    m.enterLabel = m.top.findNode("enterLabel")
    m.hintLabel = m.top.findNode("hintLabel")
    m.hintDefault = "OK = type code. Back = save. Right then OK on Enter = submit."
    m.code = ""
    m.focusOnEnter = false
    m.keyboardShown = false
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceId = CreateObject("roDeviceInfo").getChannelClientId()
    if m.deviceId = "" then m.deviceId = CreateObject("roDeviceInfo").getDeviceUniqueId()
    token = m.sec.read("deviceToken")
    if token <> "" and token <> invalid
        showMain()
    else
        m.content.setFocus(true)
    end if
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if key = "back" then
        if m.top.dialog <> invalid then
            kb = m.top.dialog
            if kb.textEditBox <> invalid and kb.textEditBox.text <> invalid then
                txt = kb.textEditBox.text
                if Len(txt) >= 4 then
                    m.code = txt
                    m.codeLabel.text = m.code
                    updateFocusUI()
                end if
            end if
            m.top.dialog.close = true
        else
            m.content.exitRequested = true
        end if
        return true
    end if
    if key = "OK" or key = "select" then
        if m.top.dialog <> invalid then return true
        if m.focusOnEnter then
            if m.code = "" or Len(m.code) < 4 then
                m.focusOnEnter = false
                updateFocusUI()
                showKeyboard()
            else
                doRegister()
            end if
        else
            if Len(m.code) >= 4 then
                doRegister()
            else
                showKeyboard()
            end if
        end if
        return true
    end if
    if key = "right" or key = "down" then
        m.focusOnEnter = true
        updateFocusUI()
        return true
    end if
    if key = "left" or key = "up" then
        m.focusOnEnter = false
        updateFocusUI()
        return true
    end if
    return false
end function

sub updateFocusUI()
    if m.focusOnEnter then
        m.enterLabel.color = "0x22C55EFF"
        m.codeLabel.color = "0x888888FF"
    else
        m.enterLabel.color = "0x666666FF"
        m.codeLabel.color = "0xFFFFFFFF"
    end if
end sub

sub setHint(t as string)
    if m.hintLabel <> invalid then m.hintLabel.text = t
end sub

sub showKeyboard()
    setHint(m.hintDefault)
    kb = CreateObject("roSGNode", "StandardKeyboardDialog")
    kb.title = "5-digit code"
    kb.message = ["No Enter key. To confirm: move RIGHT to Submit (top-right), press OK. Back = save and close."]
    kb.textEditBox.hintText = "12345"
    kb.textEditBox.maxTextLength = 10
    m.top.dialog = kb
    kb.observeField("submit", "onKeyboardSubmit")
    kb.observeField("close", "onKeyboardClose")
    kb.textEditBox.observeField("text", "onKeyboardText")
end sub

sub onKeyboardText(msg as dynamic)
    node = msg.getRoSGNode()
    if node <> invalid and node.text <> invalid then
        m.code = node.text
        m.codeLabel.text = m.code
        updateFocusUI()
    end if
end sub

sub onKeyboardSubmit()
    kb = m.top.dialog
    if kb = invalid then return
    m.code = kb.textEditBox.text
    if m.top.dialog <> invalid then m.top.dialog.close = true
    if m.code <> "" then
        m.codeLabel.text = m.code
        updateFocusUI()
    end if
end sub

sub onKeyboardClose()
    if m.top.dialog <> invalid then
        kb = m.top.dialog
        txt = kb.textEditBox.text
        if txt <> invalid and Len(txt) >= 4 then
            m.code = txt
            m.codeLabel.text = m.code
            updateFocusUI()
        end if
        m.top.dialog = invalid
    end if
end sub

sub doRegister()
    if m.code = "" or Len(m.code) < 4 then return
    setHint("Connecting...")
    if m.pendingTimer <> invalid then m.pendingTimer.control = "stop"
    m.pendingTimer = CreateObject("roSGNode", "Timer")
    m.pendingTimer.duration = 0.25
    m.pendingTimer.repeat = true
    m.pendingTimer.observeField("fire", "checkPendingRegisterResult")
    m.pendingTimer.control = "start"
    m.top.requestregister = { displayCode: m.code, deviceId: m.deviceId }
end sub

sub checkPendingRegisterResult()
    raw = m.sec.read("pendingRegisterResult")
    if raw = "" or raw = invalid then return
    m.sec.write("pendingRegisterResult", "")
    m.sec.flush()
    if m.pendingTimer <> invalid then
        m.pendingTimer.control = "stop"
        m.pendingTimer = invalid
    end if
    data = ParseJson(raw)
    if data = invalid then
        setHint("Invalid code or no connection.")
        return
    end if
    if data.error <> invalid then
        errMsg = "Invalid code or no connection."
        if data.message <> invalid and data.message <> "" then errMsg = data.message
        setHint(errMsg)
        return
    end if
    token = data.deviceToken
    if token = invalid then token = data.devicetoken
    if token = invalid or token = "" then
        setHint("Invalid code or no connection.")
        return
    end if
    setHint(m.hintDefault)
    m.sec.write("deviceToken", token)
    m.sec.write("displayCode", m.code)
    layout = data.layout
    if layout <> invalid then m.sec.write("layout", FormatJson(layout))
    lv = data.layoutVersion
    if lv = invalid then lv = data.layoutversion
    if lv <> invalid and lv <> "" then m.sec.write("layoutVersion", lv)
    ri = data.refreshIntervalSeconds
    if ri = invalid then ri = data.refreshintervalseconds
    if     ri <> invalid then m.sec.write("refreshInterval", Str(ri))
    m.sec.flush()
    if layout <> invalid and data.videoUrls <> invalid and data.videoUrls.count() > 0 then
        layout.displayUrl = data.videoUrls[0]
    end if
    showMain(layout)
end sub

sub onRegisterResult(msg as dynamic)
    data = msg.getData()
    if data = invalid then return
    if data.error <> invalid then
        errMsg = "Invalid code or no connection."
        if data.message <> invalid and data.message <> "" then errMsg = data.message
        setHint(errMsg)
        return
    end if
    token = data.deviceToken
    if token = invalid then token = data.devicetoken
    if token = invalid or token = "" then
        setHint("Invalid code or no connection.")
        return
    end if
    setHint(m.hintDefault)
    m.sec.write("deviceToken", token)
    m.sec.write("displayCode", m.code)
    layout = data.layout
    if layout <> invalid then m.sec.write("layout", FormatJson(layout))
    lv = data.layoutVersion
    if lv = invalid then lv = data.layoutversion
    if lv <> invalid and lv <> "" then m.sec.write("layoutVersion", lv)
    ri = data.refreshIntervalSeconds
    if ri = invalid then ri = data.refreshintervalseconds
    if     ri <> invalid then m.sec.write("refreshInterval", Str(ri))
    m.sec.flush()
    if data.layout <> invalid and data.videoUrls <> invalid and data.videoUrls.count() > 0 then
        data.layout.displayUrl = data.videoUrls[0]
    end if
    showMain(data.layout)
end sub

sub showMain(initialLayout = invalid as dynamic)
    if m.main <> invalid then return
    m.content.visible = false
    m.main = m.top.createChild("MainScene")
    m.main.id = "main"
    if initialLayout <> invalid then m.main.layout = initialLayout
    m.main.setFocus(true)
end sub
