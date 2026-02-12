package com.digitalsignage.tv.signage.player

import android.content.Context
import android.view.ViewGroup
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages ExoPlayer instances for video sections. Releases on lifecycle; restarts on error.
 */
@UnstableApi
class PlayerManager(private val context: Context) {

    private val players = ConcurrentHashMap<String, ExoPlayer>()
    private val loadControl = DefaultLoadControl.Builder()
        .setBufferDurationsMs(5000, 30_000, 2500, 5000)
        .build()

    fun getOrCreatePlayerView(sectionId: String, url: String, width: Int, height: Int): PlayerView {
        val playerView = PlayerView(context).apply {
            layoutParams = ViewGroup.LayoutParams(width, height)
            useController = false
        }

        val dataSourceFactory = androidx.media3.datasource.DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(20_000)

        val mediaSourceFactory = DefaultMediaSourceFactory(context)
            .setDataSourceFactory(dataSourceFactory)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()
            .apply {
                setMediaItem(MediaItem.fromUri(url))
                repeatMode = Player.REPEAT_MODE_ALL
                playWhenReady = true
                prepare()
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        if (playbackState == Player.STATE_IDLE || playbackState == Player.STATE_ENDED) {
                            prepare()
                            playWhenReady = true
                        }
                    }
                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        prepare()
                        playWhenReady = true
                    }
                })
            }

        playerView.player = player
        players[sectionId] = player
        return playerView
    }

    fun releasePlayer(sectionId: String) {
        players.remove(sectionId)?.release()
    }

    fun releaseAll() {
        players.values.forEach { it.release() }
        players.clear()
    }
}
