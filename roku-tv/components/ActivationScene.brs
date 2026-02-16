sub init()
    m.title = m.top.findNode("title")
    m.hint = m.top.findNode("hint")
    m.error = m.top.findNode("error")
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceId = CreateObject("roDeviceInfo").getChannelClientId()
    if m.deviceId = "" then m.deviceId = CreateObject("roDeviceInfo").getChannelClientId()
    m.keyboardShown = false
    m.top.setFocus(true)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if key = "OK" or key = "select"
        if m.keyboardShown <> true then showKeyboard()
        return true
    end if
    return false
end function

sub showKeyboard()
    m.keyboardShown = true
    kb = CreateObject("roSGNode", "StandardKeyboardDialog")
    kb.title = "Display Code (5 digits)"
    kb.message = ["Enter the 5-digit code from Admin Screens"]
    kb.textEditBox.hintText = "12345"
    kb.textEditBox.maxTextLength = 10
    kb.textEditBox.keyboardSubtype = "numeric"
    m.top.dialog = kb
    kb.observeField("submit", "onKeyboardSubmit")
end sub

sub onKeyboardSubmit()
    kb = m.top.dialog
    if kb = invalid then return
    code = kb.textEditBox.text
    if m.top.dialog <> invalid then m.top.dialog.close = true
    m.keyboardShown = false
    if code = "" or Len(code) < 4
        m.error.text = "Enter valid display code (5 digits)"
        m.error.visible = true
        return
    end if
    m.error.visible = false
    doRegister(code)
end sub

sub doRegister(displayCode as string)
    json = ApiRegister(displayCode, m.deviceId)
    if json = invalid
        m.error.text = "Network error. Retry."
        m.error.visible = true
        return
    end if
    err = json.error
    if err <> invalid
        msg = json.message
        if msg = invalid then msg = "Activation failed"
        m.error.text = msg
        m.error.visible = true
        return
    end if
    token = json.deviceToken
    if token = invalid or token = ""
        m.error.text = "Invalid response"
        m.error.visible = true
        return
    end if
    m.sec.write("deviceToken", token)
    m.sec.write("displayCode", displayCode)
    layout = json.layout
    if layout <> invalid
        layoutStr = FormatJson(layout)
        m.sec.write("layout", layoutStr)
    end if
    if json.layoutVersion <> invalid and json.layoutVersion <> ""
        m.sec.write("layoutVersion", json.layoutVersion)
    end if
    refresh = json.refreshIntervalSeconds
    if refresh <> invalid then m.sec.write("refreshInterval", Str(refresh))
    m.sec.flush()
    m.top.transitionToMain = "main"
end sub
