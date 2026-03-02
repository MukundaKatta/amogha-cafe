package com.amoghahotels.kiosk;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Device admin receiver for kiosk lock task mode.
 * To enable: adb shell dpm set-device-owner com.amoghahotels.kiosk/.KioskDeviceAdmin
 * To disable: adb shell dpm remove-active-admin com.amoghahotels.kiosk/.KioskDeviceAdmin
 */
public class KioskDeviceAdmin extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        // Device admin enabled
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        // Device admin disabled
    }
}
