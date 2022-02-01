import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  StripeCardElement,
  StripeCardElementChangeEvent,
  StripeCardElementOptions,
} from "@stripe/stripe-js";
import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import styles from "../../styles/orders/CheckoutForm.module.scss";

interface CheckoutFormProps {
  numCourses: number;
}

const CheckoutForm: React.FunctionComponent<CheckoutFormProps> = ({
  numCourses,
}) => {
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [disabled, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("https://localhost:5001/payment/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coursesToBuy: Array(numCourses).fill({ id: "course" }), // temp solution, send this array of n items for the backend to calculate the price
        price: 2599,
      }), // * change price here, 1 unit = 1 cent
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        // client secret Token generated by Stripe, sent by our backend
        // used for tracking a succesful, failed or incomplete PaymentIntent
        setClientSecret(data.clientSecret);
      });
  });

  /**
   * For now, read user input for the card field to give a live update
   * on whether or not their card info is valid so far
   *
   * @param event Stripes event for reading changes made in the card field
   */
  const handleChange = async (event: StripeCardElementChangeEvent) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    // an error message from the stripe card would either state if a
    // credit/debit card has insufficient funds or that the user isn't
    // authorized to use said card.
    setError(event.error ? event.error.message : "");
  };

  /**
   * Submit the user's card info to begin payment processing 💳🔄
   *
   * @param ev Event object for reading data from the form once submitted
   */
  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setProcessing(true);
    if (elements)
    {
      if (stripe)
      {
         const payload = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement) as StripeCardElement,
          },
        });
    
        if (payload.error) {
          // If Stripe determines there was an issue processing a users card
          // this error should run
          setError(`Payment failed ${payload.error.message}`);
          setProcessing(false);
        } else {
         // payment succeeded, set states accordingly 💳✅
         setError(null);
         setProcessing(false);
         setSucceeded(true);
        }
      }
    }
  };

  // Styles for the card field based on valid or invalid conditions
  const cardStyle: StripeCardElementOptions = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: "Arial, sans-serif",
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#32325d",
        },
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a",
      },
    },
  };

  return (
    <div className={styles.container}>
      <div className={styles["checkout-form-container"]}>
        <div className={styles["form-group"]}>
          <form
            id={styles["payment-form"]}
            // onSubmit will be triggered for a form once it's button
            // is clicked
            onSubmit={
              // we use an asynchrounous function, so make our onSubmit function
              // property async as well
              async (e) => {
                await handleSubmit(e);
              }
            }
          >
            {/* prebuilt element from Stripe.js. Gives us a field for entering card info
            as well as utilities for validation and error handling
        */}
            <CardElement
              id={styles["card-element"]}
              options={cardStyle}
              // onChange is fired everytime a user enters a character
              // in the cardfield
              onChange={handleChange}
            />
            <button disabled={processing || disabled || succeeded} id="submit">
              <span id="button-text">
                {/* If a payment is processing, render a spinner, otherwise prompt the user
                for pamynent comfirmation. */}
                {processing ? (
                  <div className={styles.spinner} id={styles["spinner"]}></div>
                ) : (
                  "Pay now"
                )}
              </span>
            </button>
            {/* Show any error that happens if a payment failed to process */}
            {error && (
              <div
                id={styles["card-error"]}
                className={`mt-2 ${styles["card-error"]}`}
                role="alert"
              >
                {error}
              </div>
            )}
            {/* Show a success message upon completion by toggling off the hidden style*/}
            <p
              className={
                succeeded
                  ? `text-white ${styles["result-message"]} mt-2`
                  : `${styles["result-message"]} ${styles["hidden"]}`
              }
            >
              <p>Success! Thank you for your purchase 🎉</p>
              <p>
                See the result in your
                <a href={`https://dashboard.stripe.com/test/payments`}>
                  {" "}
                  Stripe dashboard.
                </a>{" "}
                Refresh the page to try again.
              </p>
            </p>
            <h3 className="m-0 mt-3 p-0 text-white">
              Total: ${numCourses * 20}
            </h3>
          </form>
        </div>
      </div>
      <div id={styles["card-info"]}>
        <h3 className="text-white">Test Cards</h3>
        <ul>
          <li>
            <p>Valid Card</p>
            <p>4242 4242 4242 4242</p>
          </li>
          <li>
            <p>Declined Card (insufficient funds)</p>
            <p>4000 0000 0000 9995</p>
          </li>
          <li>
            <p>Authentication required</p>
            <p>4000 0025 0000 3155</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CheckoutForm;
