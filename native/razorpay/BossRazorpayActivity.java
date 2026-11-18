package __APP_PACKAGE__;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import org.json.JSONObject;

public class BossRazorpayActivity extends Activity implements PaymentResultWithDataListener {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The SDK checkout activity can still be on top after Android restores this activity.
        if (savedInstanceState != null) return;
        try {
            JSONObject options = new JSONObject(getIntent().getStringExtra("options"));
            String key = options.optString("key");
            if (!key.matches("rzp_(test|live)_[A-Za-z0-9]+") || !options.optString("order_id").matches("order_[A-Za-z0-9]+") || options.optLong("amount") < 100) {
                finishError("CHECKOUT_ERROR");
                return;
            }
            Checkout checkout = new Checkout();
            checkout.setKeyID(key);
            options.remove("key");
            options.put("retry", new JSONObject().put("enabled", false));
            // Native Android Standard Checkout discovers installed UPI apps.
            // Enabled payment methods are controlled by the merchant's Razorpay account.
            Checkout.preload(getApplicationContext());
            checkout.open(this, options);
        } catch (Exception error) { finishError("CHECKOUT_ERROR"); }
    }

    @Override
    public void onPaymentSuccess(String paymentId, PaymentData paymentData) {
        if (paymentData == null) { finishError("CHECKOUT_ERROR"); return; }
        Intent result = new Intent();
        result.putExtra("razorpay_payment_id", paymentId);
        result.putExtra("razorpay_order_id", paymentData.getOrderId());
        result.putExtra("razorpay_signature", paymentData.getSignature());
        setResult(RESULT_OK, result);
        finish();
    }

    @Override
    public void onPaymentError(int code, String description, PaymentData paymentData) {
        finishError(code == Checkout.PAYMENT_CANCELED ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED");
    }

    private void finishError(String code) {
        setResult(RESULT_CANCELED, new Intent().putExtra("error_code", code));
        finish();
    }
}
