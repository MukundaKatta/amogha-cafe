package com.amoghahotels.kiosk;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetooth_connect"),
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN }, alias = "bluetooth_scan")
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BTPrinter";
    // Standard SPP UUID for Bluetooth serial communication
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothSocket socket;
    private OutputStream outputStream;
    private String connectedDeviceName;

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!hasBluetoothPermission()) {
            requestAllPermissions(call, "bluetoothPermsCallback");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth not available on this device");
            return;
        }

        if (!adapter.isEnabled()) {
            call.reject("Bluetooth is turned off. Please enable Bluetooth.");
            return;
        }

        try {
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            JSObject result = new JSObject();
            com.getcapacitor.JSArray devices = new com.getcapacitor.JSArray();
            for (BluetoothDevice device : paired) {
                JSObject d = new JSObject();
                d.put("name", device.getName());
                d.put("address", device.getAddress());
                devices.put(d);
            }
            result.put("devices", devices);
            call.resolve(result);
        } catch (SecurityException e) {
            call.reject("Bluetooth permission denied: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!hasBluetoothPermission()) {
            requestAllPermissions(call, "bluetoothPermsCallback");
            return;
        }

        String deviceName = call.getString("deviceName");
        if (deviceName == null || deviceName.isEmpty()) {
            call.reject("deviceName is required");
            return;
        }

        // Disconnect existing connection
        disconnect(null);

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth is not available or disabled");
            return;
        }

        try {
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            BluetoothDevice target = null;

            for (BluetoothDevice device : paired) {
                String name = device.getName();
                if (name != null && name.toLowerCase().contains(deviceName.toLowerCase())) {
                    target = device;
                    break;
                }
            }

            if (target == null) {
                call.reject("Printer '" + deviceName + "' not found in paired devices. Please pair it in Android Bluetooth settings first.");
                return;
            }

            // Cancel discovery to speed up connection
            adapter.cancelDiscovery();

            socket = target.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            outputStream = socket.getOutputStream();
            connectedDeviceName = target.getName();

            JSObject result = new JSObject();
            result.put("connected", true);
            result.put("deviceName", connectedDeviceName);
            result.put("address", target.getAddress());
            call.resolve(result);

            Log.i(TAG, "Connected to " + connectedDeviceName);

        } catch (SecurityException e) {
            call.reject("Bluetooth permission denied: " + e.getMessage());
        } catch (IOException e) {
            Log.e(TAG, "Connection failed", e);
            call.reject("Failed to connect to '" + deviceName + "': " + e.getMessage() + ". Make sure the printer is ON and paired.");
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (outputStream == null || socket == null || !socket.isConnected()) {
            // Try auto-connect using deviceName
            String deviceName = call.getString("deviceName");
            if (deviceName != null && !deviceName.isEmpty()) {
                autoConnect(deviceName);
            }
            if (outputStream == null) {
                call.reject("Not connected to any printer. Call connect() first.");
                return;
            }
        }

        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("data is required (base64 encoded ESC/POS bytes)");
            return;
        }

        try {
            byte[] bytes = android.util.Base64.decode(data, android.util.Base64.DEFAULT);
            outputStream.write(bytes);
            outputStream.flush();

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("bytesWritten", bytes.length);
            call.resolve(result);

            Log.i(TAG, "Printed " + bytes.length + " bytes to " + connectedDeviceName);

        } catch (IOException e) {
            Log.e(TAG, "Print failed", e);
            // Connection lost — clean up
            cleanupConnection();
            call.reject("Print failed: " + e.getMessage() + ". Printer may have disconnected.");
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printText(PluginCall call) {
        if (outputStream == null || socket == null || !socket.isConnected()) {
            String deviceName = call.getString("deviceName");
            if (deviceName != null && !deviceName.isEmpty()) {
                autoConnect(deviceName);
            }
            if (outputStream == null) {
                call.reject("Not connected to any printer");
                return;
            }
        }

        String text = call.getString("text");
        if (text == null) {
            call.reject("text is required");
            return;
        }

        try {
            byte[] bytes = text.getBytes(Charset.forName("GBK"));
            outputStream.write(bytes);
            outputStream.flush();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (IOException e) {
            cleanupConnection();
            call.reject("Print failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        cleanupConnection();
        if (call != null) {
            JSObject result = new JSObject();
            result.put("disconnected", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        boolean connected = socket != null && socket.isConnected() && outputStream != null;
        JSObject result = new JSObject();
        result.put("connected", connected);
        result.put("deviceName", connected ? connectedDeviceName : null);
        call.resolve(result);
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        if (call == null) return;
        String method = call.getMethodName();
        if ("listPairedDevices".equals(method)) {
            listPairedDevices(call);
        } else if ("connect".equals(method)) {
            connect(call);
        } else {
            call.resolve();
        }
    }

    private void autoConnect(String deviceName) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) return;

        try {
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            for (BluetoothDevice device : paired) {
                String name = device.getName();
                if (name != null && name.toLowerCase().contains(deviceName.toLowerCase())) {
                    adapter.cancelDiscovery();
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                    outputStream = socket.getOutputStream();
                    connectedDeviceName = device.getName();
                    Log.i(TAG, "Auto-connected to " + connectedDeviceName);
                    return;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Auto-connect failed: " + e.getMessage());
        }
    }

    private void cleanupConnection() {
        try {
            if (outputStream != null) outputStream.close();
        } catch (IOException e) { /* ignore */ }
        try {
            if (socket != null) socket.close();
        } catch (IOException e) { /* ignore */ }
        outputStream = null;
        socket = null;
        connectedDeviceName = null;
    }

    private boolean hasBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getActivity(),
                Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Pre-Android 12 doesn't need runtime permission
    }
}
