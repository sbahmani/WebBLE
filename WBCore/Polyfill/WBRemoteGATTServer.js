/*global
        atob, Event, nslog, uk, window
*/
// https://webbluetoothcg.github.io/web-bluetooth/ interface

(function () {
  'use strict';

  const wb = uk.co.greenparksoftware.wb;
  const wbutils = uk.co.greenparksoftware.wbutils;

  nslog('Create BluetoothRemoteGATTServer');
  wb.BluetoothRemoteGATTServer = function (webBluetoothDevice) {
    if (webBluetoothDevice === undefined) {
      throw new Error('Attempt to create BluetoothRemoteGATTServer with no device');
    }
    wbutils.defineROProperties(this, {device: webBluetoothDevice});
    this.connected = false;
    this.connectionTransactionIDs = [];
  };
  wb.BluetoothRemoteGATTServer.prototype = {
    connect: function () {
      let self = this;
      let tid = wb.native.getTransactionID();
      this.connectionTransactionIDs.push(tid);
      return this.sendMessage('connectGATT', {callbackID: tid}).then(function () {
        self.connected = true;
        wb.native.registerDeviceForNotifications(self.device);
        self.connectionTransactionIDs.splice(
          self.connectionTransactionIDs.indexOf(tid),
          1
        );

        return self;
      });
    },
    disconnect: function () {
      this.connectionTransactionIDs.forEach((tid) => wb.native.cancelTransaction(tid));
      this.connectionTransactionIDs = [];
      if (!this.connected) {
        return;
      }
      this.connected = false;

      // since we've set connected false this event won't be generated
      // by the shortly to be dispatched disconnect event.
      this.device.dispatchEvent(new wb.BluetoothEvent('gattserverdisconnected', this.device));
      wb.native.unregisterDeviceForNotifications(this.device);
      // If there were two devices pointing at the same underlying device
      // this would break both connections, so not really what we want,
      // but leave it like this till someone complains.
      this.sendMessage('disconnectGATT');
    },
    getPrimaryService: function (UUID) {
      let canonicalUUID = window.BluetoothUUID.getService(UUID);
      let self = this;
      return this.sendMessage(
        'getPrimaryService',
        {data: {serviceUUID: canonicalUUID}}
      ).then(() => new wb.BluetoothRemoteGATTService(
        self.device,
        canonicalUUID,
        true
      ));
    },

    getPrimaryServices: function (UUID) {
      if (true) {
        throw new Error('Not implemented');
      }
      let device = this.device;
      let canonicalUUID = window.BluetoothUUID.getService(UUID);
      return this.sendMessage(
        'getPrimaryServices', {data: {serviceUUID: canonicalUUID}}
      ).then(function (servicesJSON) {
        let servicesData = JSON.parse(servicesJSON);
        let services = servicesData;
        services = device;
        services = [];

        // this is a problem - all services will have the same information (UUID) so no way for this side of the code to differentiate.
        // we need to add an identifier GUID to tell them apart
        // servicesData.forEach(
        //     (service) => services.push(
        //         new native.BluetoothRemoteGATTService(device, canonicalUUID, true)
        //     )
        // );
        return services;
      });
    },
    sendMessage: function (type, messageParms) {
      messageParms = messageParms || {};
      messageParms.data = messageParms.data || {};
      messageParms.data.deviceId = this.device.id;
      return wb.native.sendMessage('device:' + type, messageParms);
    },
    toString: function () {
      return `BluetoothRemoteGATTServer(${this.device.toString()})`;
    }
  };
  nslog('Created');
})();
