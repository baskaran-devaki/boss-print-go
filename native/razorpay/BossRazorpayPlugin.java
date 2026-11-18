package __APP_PACKAGE__;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BossRazorpay")
public class BossRazorpayPlugin extends Plugin {
    private boolean checkoutOpen = false;

    @PluginMethod
    public void open(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (checkoutOpen) {
                call.reject("A payment is already open.", "CHECKOUT_BUSY");
                return;
            }
            String url = getBridge().getWebView().getUrl();
            // This app loads its own remote Vercel site. Other pages cannot open checkout.
            if (url == null || !(url.equals("https://boss-print-go.vercel.app") || url.startsWith("https://boss-print-go.vercel.app/"))) {
                call.reject("Payment is only available on the BOSS PrintGo website.", "INVALID_ORIGIN");
                return;
            }
            checkoutOpen = true;
            Intent intent = new Intent(getActivity(), BossRazorpayActivity.class);
            intent.putExtra("options", call.getData().toString());
            try { startActivityForResult(call, intent, "paymentResult"); }
            catch (Exception error) {
                checkoutOpen = false;
                call.reject("Unable to open payment checkout.", "CHECKOUT_ERROR");
            }
        });
    }

    @ActivityCallback
    private void paymentResult(PluginCall call, ActivityResult result) {
        checkoutOpen = false;
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            JSObject response = new JSObject();
            response.put("razorpay_payment_id", data.getStringExtra("razorpay_payment_id"));
            response.put("razorpay_order_id", data.getStringExtra("razorpay_order_id"));
            response.put("razorpay_signature", data.getStringExtra("razorpay_signature"));
            call.resolve(response);
        } else {
            String code = data == null ? "PAYMENT_CANCELLED" : data.getStringExtra("error_code");
            call.reject("Payment was cancelled or could not be completed.", code == null ? "PAYMENT_FAILED" : code);
        }
    }
}
