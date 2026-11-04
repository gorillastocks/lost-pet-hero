import Capacitor

class LostPetViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LostPetStorePlugin())
    }
}
