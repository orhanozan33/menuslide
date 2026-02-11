package com.digitalsignage.tv.player

import android.content.Context
import android.view.ViewGroup
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.digitalsignage.tv.data.local.CacheManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@UnstableApi
@Singleton
class PlayerManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cacheManager: CacheManager
) {
    private var exoPlayer: ExoPlayer? = null
    private var currentUrl: String? = null

    fun getOrCreatePlayer(): ExoPlayer {
        if (exoPlayer == null) {
            val httpFactory = DefaultHttpDataSource.Factory()
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(20_000)
            val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(httpFactory)
            exoPlayer = ExoPlayer.Builder(context)
                .setMediaSourceFactory(mediaSourceFactory)
                .build()
                .apply {
                    repeatMode = Player.REPEAT_MODE_ONE
                    playWhenReady = true
                }
        }
        return exoPlayer!!
    }

    fun attachPlayerView(playerView: PlayerView) {
        playerView.player = getOrCreatePlayer()
    }

    fun setVideoUrl(url: String?, container: ViewGroup?) {
        if (url.isNullOrBlank()) return
        if (url == currentUrl) return
        currentUrl = url
        val player = getOrCreatePlayer()
        val cached = cacheManager.getCachedFile(url)
        val mediaItem = if (cached != null) {
            MediaItem.fromUri(android.net.Uri.fromFile(cached))
        } else {
            MediaItem.fromUri(url)
        }
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
    }

    fun release() {
        exoPlayer?.release()
        exoPlayer = null
        currentUrl = null
    }

    fun findVideoContainer(root: ViewGroup, videoUrl: String?): ViewGroup? {
        if (videoUrl.isNullOrBlank()) return null
        for (i in 0 until root.childCount) {
            val v = root.getChildAt(i)
            if (v is ViewGroup && v.tag == videoUrl) return v
            if (v is ViewGroup) findVideoContainer(v, videoUrl)?.let { return it }
        }
        return null
    }
}
