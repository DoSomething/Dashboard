set applicationPosixPath to "/Applications/Rdio.app"

try
    do shell script "/bin/ps -ef | grep " & quoted form of applicationPosixPath & " | grep -v grep"
    tell application "Rdio" to play source "p1053413"
on error
    tell application "Rdio" to activate
    delay 5
    tell application "Rdio" to play source "p1053413"
end try