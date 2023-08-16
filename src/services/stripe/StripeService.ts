import axios, { AxiosResponse } from 'axios'

const API_BASE = 'https://api.stripe.com/v1/'

const headers = {
  Authorization: `${import.meta.env.VITE_STRIPE_PRIVATE_KEY}`,
  'Content-Type': 'application/x-www-form-urlencoded'
}

interface CustomerCreationParams {
  email: string;
  fullName: string;
  applicationId: string;
}

interface SubscriptionCreationParams {
  customerId: string;
  priceId: string;
  applicationId: string;
}

const stripeService = {
  getCustomer: async (email: string): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('query', `email:'${email}'`)

    return axios.get(`${API_BASE}customers/search`, {
      params: formData,
      headers
    })
  },

  createCustomer: async ({ email, fullName, applicationId }: CustomerCreationParams): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('email', email)
    formData.append('name', fullName)
    formData.append('metadata[kong_application_id]', applicationId)

    return axios.post(`${API_BASE}customers`, formData.toString(), {
      headers
    })
  },

  fetchProducts: async (): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE}products`, {
      headers
    })
  },

  fetchSubscriptions: async (customerId: string): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('customer', `${customerId}`)

    return axios.get(`${API_BASE}subscriptions`, {
      params: formData,
      headers
    })
  },

  fetchUpcomingInvoices: async (customerId: string): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('customer', `${customerId}`)

    return axios.get(`${API_BASE}invoices/upcoming/lines`, {
      params: formData,
      headers
    })
  },

  fetchPrices: async (): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('active', 'true')

    return axios.get(`${API_BASE}prices`, {
      params: formData,
      headers
    })
  },

  getPriceName: async (priceId: string): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE}prices/${priceId}`, {
      headers
    })
  },

  getProduct: async (productId: string): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    return axios.get(`${API_BASE}products/${productId}`, {
      params: formData,
      headers
    })
  },

  createSubscription: async ({ customerId, priceId, applicationId }: SubscriptionCreationParams): Promise<AxiosResponse> => {
    const formData = new URLSearchParams()

    formData.append('customer', customerId)
    formData.append('items[0][price]', priceId)
    formData.append('enable_incomplete_payments', 'false')
    formData.append('metadata[kong_application_id]', `app_${applicationId}`)

    return axios.post(`${API_BASE}subscriptions`, formData.toString(), {
      headers
    })
  }
}

export default stripeService
