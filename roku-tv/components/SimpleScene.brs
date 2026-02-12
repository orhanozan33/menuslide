sub init()
    m.top.setFocus(true)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if press and (key = "OK" or key = "select") then
        m.top.findNode("mainLabel").text = "OK pressed! - Activation coming..."
        return true
    end if
    return false
end function
