sub init()
    m.activation = m.top.findNode("activation")
    m.main = m.top.findNode("main")
    sec = CreateObject("roRegistrySection", "menuslide")
    token = sec.read("deviceToken")
    if token <> "" and token <> invalid
        m.main.visible = true
        m.activation.visible = false
    else
        m.main.visible = false
        m.activation.visible = true
        m.activation.setFocus(true)
        m.activation.observeField("transitionToMain", "onActivationDone")
    end if
end sub

sub onActivationDone()
    m.activation.visible = false
    m.main.visible = true
    m.main.setFocus(true)
end sub
