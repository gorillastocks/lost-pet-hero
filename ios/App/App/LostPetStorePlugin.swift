import Capacitor
import StoreKit

/// Presents the App Store purchase sheet for the full game. The JavaScript
/// parental gate must pass before this is called.
@objc(LostPetStorePlugin)
public class LostPetStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LostPetStorePlugin"
    public let jsName = "LostPetStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    private let productId = "com.gorillastocks.lostpethero.fullgame"

    @objc func purchase(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("The full game is not in the App Store yet.")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["owned": true])
                    case .unverified:
                        call.reject("The App Store could not verify that purchase.")
                    }
                case .userCancelled:
                    call.resolve(["owned": false, "cancelled": true])
                case .pending:
                    call.resolve(["owned": false, "pending": true])
                @unknown default:
                    call.resolve(["owned": false])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            var owned = false
            for await result in Transaction.currentEntitlements {
                if case .verified(let transaction) = result, transaction.productID == productId {
                    owned = true
                }
            }
            call.resolve(["owned": owned])
        }
    }
}
