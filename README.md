# jukebox
A jukebox web app using Spotify API - device control, playlist loaded

To deploy:
The javascript file requires five updates as the authorization information is hard-coded.

Screenshot:
<br><img src="jukeboxScreen.png" width=500><br>

Possible bugs:
Device ID might be better retrieved by API than hard-coded. 
-Build a preference list of device IDs, use first one present in the return from device API https://developer.spotify.com/console/get-users-available-devices/
