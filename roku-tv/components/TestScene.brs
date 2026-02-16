sub init()
    m.sec = CreateObject("roRegistrySection", "menuslide")
    m.deviceId = CreateObject("roDeviceInfo").getChannelClientId()
    if m.deviceId = "" then m.deviceId = CreateObject("roDeviceInfo").getChannelClientId()
    m.keyboardShown = false
    token = m.sec.read("deviceToken")
    if token <> "" and token <> invalid
        showMain()
    else
        m.top.setFocus(true)
    end if
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
    kb.title = "5-digit code"
    kb.message = ["Broadcast Code from Admin screen"]
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
        return
    end if
    doRegister(code)
end sub

sub doRegister(displayCode as string)
    json = ApiRegister(displayCode, m.deviceId)
    if json = invalid
        return
    end if
    if json.error <> invalid
        return
    end if
    token = json.deviceToken
    if token = invalid or token = ""
        return
    end if
    m.sec.write("deviceToken", token)
    m.sec.write("displayCode", displayCode)
    if json.layout <> invalid
        m.sec.write("layout", FormatJson(json.layout))
    end if
    if json.layoutVersion <> invalid and json.layoutVersion <> ""
        m.sec.write("layoutVersion", json.layoutVersion)
    end if
    if json.refreshIntervalSeconds <> invalid
        m.sec.write("refreshInterval", Str(json.refreshIntervalSeconds))
    end if
    m.sec.flush()
    showMain()
end sub

sub showMain()
    if m.main <> invalid then return
    m.main = m.top.createChild("MainScene")
    m.main.id = "main"
    m.main.setFocus(true)
end sub
' v1.0.14 - Build 14 - TestScene + aktivasyon + MainScene, 2026-02-12
