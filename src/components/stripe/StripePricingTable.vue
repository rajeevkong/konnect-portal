<template>
    <div class="container">
        <h2 class="title">Products and pricing</h2>
        <div v-if="loading" class="loading">Loading prices...</div>
        <div v-else class="price-cards">
            <div v-for="price in prices" :key="price.id" class="price-card">
                <div class="card-header">
                    <p class="product-name">{{ priceToProduct[price.id].name }}</p>
                </div>
                <div class="product-section">
                    <p class="product-description">
                        {{ priceToProduct[price.id].description }}
                    </p>
                </div>
                <div class="price-section">
                    <h3 class="price-nickname">{{ price.nickname }}</h3>
                    <p>{{ formatPricing(price) }}</p>
                </div>
                <div class="card-footer">
                    <p class="price-description">{{ price.description }}</p>
                    <button
                        @click="createSubscription(price.id, (getProduct(price.product)).metadata.kongGatewayServiceId, (getProduct(price.product)).name)"
                        :disabled="isPriceSubscribed(price.id) || subscriptionSuccess" :class="{
                            'subscribe-button': !isPriceSubscribed(price.id),
                            'grayed-out': isPriceSubscribed(price.id),
                        }">
                        Subscribe
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
  
<style scoped>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
}

.title {
    font-size: 24px;
    margin-bottom: 20px;
}

.loading {
    margin-top: 20px;
}

.price-cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 20px;
}

.price-card {
    width: 300px;
    height: 300px;
    /* Set a fixed height for each card */
    background-color: white;
    border: 1px solid black;
    /* Add a border to the card */
    padding: 20px;
    margin: 10px;
    display: flex;
    flex-direction: column;
}

.card-header {
    border-bottom: 1px solid black;
    /* Add a border at the bottom of the header section */
}

.product-section {
    flex: 1;
}

.price-section {
    flex: 1;
}

.card-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.product-name {
    font-size: 14px;
    font-weight: bolder;
    margin-bottom: 10px;
    color: blue;
}

.product-description {
    font-size: 12px;
    font-weight: bolder;
    margin-bottom: 10px;
    color: rgb(31, 31, 33);
}

.price-nickname {
    font-size: 16px;
    font-weight: bolder;
    margin-bottom: 10px;
}

.price-description {
    font-size: 12px;
    margin-bottom: 20px;
}

.subscribe-button {
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    cursor: pointer;
}

.grayed-out {
    background-color: #cccccc;
    opacity: 0.6;
    cursor: not-allowed;
    color: black;
    border-radius: 5px;
    padding: 10px 20px;
}
</style>
  

<script>
import { ref } from 'vue';

import { useRoute, useRouter } from 'vue-router'

import axios from 'axios';
import { useI18nStore, useAppStore } from '@/stores'
import { mapState, storeToRefs } from 'pinia'
import usePortalApi from '@/hooks/usePortalApi'
import { CreateApplicationPayload } from '@kong/sdk-portal-js'
import cleanupEmptyFields from '@/helpers/cleanupEmptyFields'
import stripeService from '@/services/stripe/StripeService';



const { portalApiV2 } = usePortalApi();




export default {
    setup() {
        const $router = useRouter();
    },
    name: 'MeteredSubscription',
    data() {
        return {
            stripe: null,
            products: [],
            prices: [],
            loading: true,
            customer: '',
            subscriptions: [],
            isCustomer: false,
            subscriptionSuccess: false,
            developer: {},

        };
    },
    async mounted() {
        this.loading = true;
        try {
            await this.initialize();
        } catch (error) {
            console.error(error);
        } finally {
            this.loading = false;
        }
    },

    computed: {
        isPriceSubscribed() {
            return (priceId) => {
                // Check if the price ID exists in the list of subscriptions
                return this.subscriptions.some((subscription) => {
                    return subscription.items.data.some((item) => {
                        console.log(`Condition ${priceId}, ${item.price.id}  ->  + ${(item.price.id === priceId)}`);
                        return item.price.id === priceId;
                    });
                });
            };
        },
        priceToProduct() {
            const map = {};
            this.prices.forEach(price => {
                const product = this.products.find(product => product.id == price.product);
                map[price.id] = product;
            });
            return map;
        }
    },
    methods: {
        async initialize() {
            let developer = await portalApiV2.value.service.developerApi.getDeveloperMe();
            this.developer = developer.data
            await this.getCustomerData();
            await this.fetchProducts();
            await this.fetchPrices();
            await this.fetchSubscriptions();
        },
        async getCustomerData() {
            try {
                const response = await stripeService.getCustomer(this.developer.email)
                if (response) {
                    // Handle successful subscription creation
                    if (Array.isArray(response.data.data) && response.data.data.length > 0) {
                        this.customer = response.data.data[0];
                        this.isCustomer = true;
                        console.log("customer: " + JSON.stringify(this.customer));
                    } else {
                        this.isCustomer = false;
                    }

                } else {
                    this.isCustomer = false;
                    // Handle subscription creation failure
                    console.error('Failed to Get Customer:', response);
                }
            } catch (error) {
                console.error('Failed to fetch customer:', error);
            }
        },
        async createCustomer(appliationId) {
            try {
                const response = await stripeService.createCustomer({
                    email: this.developer.email,
                    fullName: this.developer.full_name,
                    applicationId: appliationId
                })
                console.log("customer: " + JSON.stringify(response.data));
                this.isCustomer = true;
                this.customer = response.data
                return response.data;

            } catch (error) {
                console.error('Failed to create customer:', error);
                return {};
            }

        },

        async fetchProducts() {
            try {
                const response = await stripeService.fetchProducts()
                this.products = response.data.data;
                this.loading = false;
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        },
        async fetchSubscriptions() {

            try {
                if (this.isCustomer) {
                    const response = await stripeService.fetchSubscriptions(this.customer.id)
                    this.subscriptions = response.data.data;
                    console.log("Subscrptions: " + this.subscriptions)
                } else {
                    console.log("No subscriptions")
                    this.subscriptions = []
                }

            } catch (error) {
                this.subscriptions = []
                console.error('Failed to fetch prices:', error);
            }
        },
        async fetchPrices() {

            try {
                const response = await stripeService.fetchPrices();

                this.prices = response.data.data;
                this.loading = false;
            } catch (error) {
                console.error('Failed to fetch prices:', error);
            }
        },


        getProduct(productId) {
            var product = this.products.filter(product => product.id == productId);
            console.log("Product -> : " + JSON.stringify(product[0]))
            return product[0];
        },
        formatPrice(amount) {
            // Format the price amount as needed (e.g., add currency symbol, decimal places)
            return (amount / 100).toFixed(2);
        },

        formatPricing(pricingObject) {
            // Extracting the billing scheme
            const billingScheme = pricingObject.billing_scheme;

            // Extracting the unit amount and converting to dollars
            const unitAmount = pricingObject.unit_amount ? pricingObject.unit_amount / 100 : 0;

            // Adding the symbol for AUD
            const currencySymbol = pricingObject.currency === 'aud' ? 'A$' : '';

            // Extracting the interval
            const interval = pricingObject.recurring && pricingObject.recurring.interval
                ? pricingObject.recurring.interval
                : '';

            if (billingScheme === 'per_unit') {
                // Extracting the transform quantity for per_unit
                const groupOf = pricingObject.transform_quantity && pricingObject.transform_quantity.divide_by
                    ? ` per group of ${pricingObject.transform_quantity.divide_by}`
                    : '';

                return `${currencySymbol}${unitAmount.toFixed(2)}${groupOf} / ${interval}`;
            } else if (billingScheme === 'graduated') {
                return `Starts at ${currencySymbol}${unitAmount.toFixed(2)} / ${interval}`;
            } else {
                // You can handle other billing schemes here or return a default value
                return 'N/A';
            }
        },

        handleSuccess(id, productVersionId, message) {
            console.log(`Application with ${id} ${message} ${productVersionId}`)
            portalApiV2.value.service.registrationsApi.createApplicationRegistration({
                applicationId: id,
                createRegistrationPayload: {
                    product_version_id: productVersionId
                }
            })
                .then(
                    /** @param {import('axios').AxiosResponse<{status: 'approved'|'pending'}>} res */
                    res => {
                        let message = 'Registration '
                        console.log(`Registration response -> ${JSON.stringify(res.data)}`);
                        if (res.data.status === 'approved') {
                            console.log(`Message: ${message}`);
                            this.$router.replace({ name: 'show-application', params: { application_id: res.data.application_id } })
                        } else if (res.data.status === 'pending') {
                            message += 'requested'
                            console.log(`Message: ${message}`);
                        }
                    })
                .catch((error) => {
                    console.log(`Error registering application -> ${error}`)
                })
        },

        handleError(error) {
            console.log(`Error creating applicaton: ${error}`)
        },
        async createApplication(productName) {
            try {
                const response = await portalApiV2.value.service.applicationsApi.createApplication({
                    createApplicationPayload: cleanupEmptyFields({ "name": `${productName} App` }),
                });

                return response;
            } catch (error) {
                console.error('Error creating application:', error);
                throw error;
            }
        },
        async createSubscription(priceId, productVersionId, productName) {
            try {
                const applicationResponse = await this.createApplication(productName);
                const application_id = `${applicationResponse.data.id}`;
                const application_reference_id = applicationResponse.data.reference_id
                console.log(`Application: Details -> ${JSON.stringify(applicationResponse.data)}`);
                this.handleSuccess(application_id, productVersionId, 'created');

                await this.getCustomerData();

                console.log(`Customer exists? ${this.isCustomer}`)
                if (!this.isCustomer) {
                    // metadata for field for customer  mapped to X-CONSUMER-USERNAME - USER_ID in moesif
                    this.customer = await this.createCustomer(application_reference_id);
                    console.log("Creating customer -> : " + this.customer.id);
                    this.isCustomer = true;
                } else {
                    console.log("Existing customer -> : " + this.customer.id);
                }

                console.log(`APPLICATION ID: ${application_id}`);


                const response = stripeService.createSubscription({
                    customerId: this.customer.id,
                    priceId,
                    applicationId: application_id
                });
                if (response) {
                    // Handle successful subscription creation
                    this.subscriptionSuccess = true;
                    await this.fetchSubscriptions();
                    this.subscriptionSuccess = false;
                    console.log('Subscription created successfully!');
                } else {
                    this.subscriptionSuccess = false;
                    // Handle subscription creation failure
                    console.error('Failed to create subscription:', response);
                }
            } catch (error) {
                console.error('Error creating subscription:', error);
            }
        },
    },
};
</script>
  