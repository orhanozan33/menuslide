' Kod ekraninda Geri tusu ile cikis (exitRequested -> main.brs ekrani kapatir)
function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if LCase(key) = "back" then
        m.top.exitRequested = true
        return true
    end if
    return false
end function
