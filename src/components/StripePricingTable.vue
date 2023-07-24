<template>
    <div class="container">
        <h2 class="title">Products and pricing</h2>
        <div v-if="loading" class="loading">Loading prices...</div>
        <div v-else class="price-cards">
            <div v-for="price in prices" :key="price.id" class="price-card">
                <div class="card-header">
                    <p class="product-name">{{ (getProduct(price.product)).name }}</p>
                </div>
                <div class="product-section">
                    <p class="product-description">
                        {{ getProduct(price.product).description }}
                    </p>
                </div>
                <div class="price-section">
                    <h3 class="price-nickname">{{ price.nickname }}</h3>
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

        };
    },
    async mounted() {
        await this.getCustomerData();
        

        await this.fetchProducts();
        await this.fetchPrices();
        await this.fetchSubscriptions();

    },

    computed: {
        ...mapState(useAppStore, {
            developer: store => store.developerSession.data?.developer,
            isPublic: 'isPublic'
        }),
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
    },
    methods: {
        async getCustomerData() {
            try {
                const formData = new URLSearchParams();
                formData.append('query', `email:'${this.developer.email}'`);
                const response = await axios.get(`https://api.stripe.com/v1/customers/search`, {
                    params: formData,
                    headers: {
                        Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded',

                    },
                });
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
                const formData = new URLSearchParams();
                formData.append('email', this.developer.email);
                formData.append('name', "Rajeev Ramani");
                formData.append('metadata[kong_application_id]', appliationId);

                const response = await axios.post(`https://api.stripe.com/v1/customers`, formData.toString(), {
                    headers: {
                        Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded',

                    },
                });
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
                const response = await axios.get('https://api.stripe.com/v1/products', {
                    headers: {
                        Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                    },
                });
                this.products = response.data.data;
                this.loading = false;
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        },
        async fetchSubscriptions() {

            try {
                if (this.isCustomer) {
                    const formData = new URLSearchParams();
                    formData.append('customer', `${this.customer.id}`);
                    const response = await axios.get('https://api.stripe.com/v1/subscriptions', {
                        params: formData,
                        headers: {
                            Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                        },
                    });
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
                const formData = new URLSearchParams();
                formData.append('active', `true`);
                const response = await axios.get('https://api.stripe.com/v1/prices', {
                    params: formData,
                    headers: {
                        Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded',

                    },
                });


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
                const formData = new URLSearchParams();
                const response = await portalApiV2.value.service.applicationsApi.createApplication({
                    createApplicationPayload: cleanupEmptyFields({ "name": `${productName} App`}),
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
                const formData = new URLSearchParams();
                formData.append('customer', this.customer.id);
                formData.append('items[0][price]', priceId);
                formData.append('enable_incomplete_payments', 'false');
                // metadata for field for subscription  mapped to X-CONSUMER-CUSTOM-ID - CCOMPANY_ID in Moelsif
                formData.append('metadata[kong_application_id]', `app_${application_id}`);

                console.log("data" + formData);
                const response = await axios.post('https://api.stripe.com/v1/subscriptions', formData.toString(), {
                    headers: {
                        Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
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
  