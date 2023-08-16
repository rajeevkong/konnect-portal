<template>
  <div class="invoices-list">
    <h2 class="font-normal type-lg m-0 mb-5">
      Upcoming Invoices
    </h2>
    <div class="invoices-card">
      <table class="invoices-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Start Period</th>
            <th>End Period</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="invoice in upcomingInvoices"
            :key="invoice.id"
          >
            <td>{{ productNames[invoice.price.product] || 'Loading...' }}</td>
            <td>{{ invoice.price.nickname }}</td>
            <td>{{ invoice.amount / 100 }} {{ invoice.currency.toUpperCase() }}</td>
            <td>{{ invoice.description }}</td>
            <td>{{ new Date(invoice.period.start * 1000).toLocaleDateString() }}</td>
            <td>{{ new Date(invoice.period.end * 1000).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import stripeService from '@/services/stripe/StripeService'
import usePortalApi from '@/hooks/usePortalApi'

const { portalApiV2 } = usePortalApi()

export default {
  data () {
    return {
      upcomingInvoices: [],
      isLoading: false,
      productNames: {},
      tableHeaders: [
        { text: 'ID', value: 'id' },
        { text: 'Amount', value: 'amount' },
        { text: 'Currency', value: 'currency' },
        { text: 'Description', value: 'description' },
        { text: 'Start Period', value: 'period.start' },
        { text: 'End Period', value: 'period.end' },
        { text: 'Subscription', value: 'subscription' }
      ]
    }
  },
  async mounted () {
    try {
      this.isLoading = true
      const developer = await portalApiV2.value.service.developerApi.getDeveloperMe()

      const customerResponse = await stripeService.getCustomer(developer.data.email)

      const response = await stripeService.fetchUpcomingInvoices(customerResponse.data.data[0].id)

      this.upcomingInvoices = response.data.data
      this.isLoading = false
      this.upcomingInvoices.forEach(invoice => {
        this.getProductName(invoice.price.product)
      })
    } catch (error) {
      console.error('Failed to fetch upcoming invoices:', error)
      this.isLoading = false
    }
  },
  methods: {
    async getProductName (productId) {
      // Check if product name is already fetched
      if (this.productNames[productId]) return

      try {
        const response = await stripeService.getProduct(productId)

        // Update the productNames property with the fetched name
        this.productNames[productId] = response.data.name
      } catch (error) {
        console.error(`Failed to fetch product name for ID ${productId}:`, error)
      }
    }
  }
}
</script>

<style scoped>
/* You can add specific styling here to match the appearance of the ProductList.vue */
.invoices-card {
  border: 1px solid #e0e0e0;
  padding: 20px;
  border-radius: 5px;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
}

.invoices-table th,
.invoices-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: left;
}

.invoices-table th {
  background-color: #f0f0f0;
}
</style>
