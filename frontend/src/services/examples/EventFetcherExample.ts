/**
 * Example usage of EventFetcher class
 * This file demonstrates how to use the dynamic event fetching utilities
 */

import { EventFetcher, EventFetcherFactory, EventFetcherUtils } from '../index'

/**
 * Example 1: Basic usage with EventFetcher class
 */
export async function basicEventFetchingExample() {
  try {
    // Create EventFetcher instance for Sepolia testnet
    const chainId = 11155111 // Sepolia
    const eventFetcher = new EventFetcher(chainId)

    // Get total number of events
    const eventCount = await eventFetcher.getEventCount()
    console.log(`Total events: ${eventCount}`)

    // Fetch details for a specific event
    const eventDetails = await eventFetcher.fetchEventDetails(1)
    if (eventDetails) {
      console.log('Event details:', eventDetails)
    }

    // Fetch event statistics
    const eventStats = await eventFetcher.fetchEventStats(1)
    console.log('Event stats:', eventStats)

  } catch (error) {
    console.error('Error in basic example:', error)
  }
}

/**
 * Example 2: Using EventFetcherFactory for instance management
 */
export async function factoryPatternExample() {
  try {
    // Get cached instance (creates new one if doesn't exist)
    const fetcher = EventFetcherFactory.getInstance(11155111)

    // Fetch all events for a specific organizer
    const organizerAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const organizerEvents = await fetcher.fetchOrganizerEvents(organizerAddress)

    console.log(`Found ${organizerEvents.length} events for organizer`)
    organizerEvents.forEach(event => {
      console.log(`- ${event.name}: ${event.stats.ticketsSold}/${event.stats.totalTickets} tickets sold`)
    })

  } catch (error) {
    console.error('Error in factory example:', error)
  }
}

/**
 * Example 3: Batch fetching with error handling
 */
export async function batchFetchingExample() {
  try {
    const chainId = 11155111

    // Use utility function with retry logic
    const events = await EventFetcherUtils.fetchWithRetry(
      chainId,
      async (fetcher) => {
        // Fetch events in batches for better performance
        return await fetcher.fetchEventsBatch(1, 10)
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
      }
    )

    console.log(`Fetched ${events.length} events in batch`)

  } catch (error) {
    console.error('Error in batch fetching example:', error)
  }
}

/**
 * Example 4: Filtering and sorting events
 */
export async function filteringAndSortingExample() {
  try {
    const fetcher = EventFetcherFactory.getInstance(11155111)

    // Fetch all events with filtering
    const allEvents = await fetcher.fetchAllEvents({
      status: [0, 1], // Only active and paused events
      limit: 20,
      offset: 0,
    })

    // Use helper functions to sort and filter
    const { sortEvents, filterEventsByStatus, searchEvents } = await import('../index')

    // Sort by creation date (newest first)
    const sortedEvents = sortEvents(allEvents, 'created', 'desc')

    // Filter by status
    const activeEvents = filterEventsByStatus(allEvents, [0])

    // Search by name
    const searchResults = searchEvents(allEvents, 'concert')

    console.log(`Total events: ${allEvents.length}`)
    console.log(`Active events: ${activeEvents.length}`)
    console.log(`Concert events: ${searchResults.length}`)

  } catch (error) {
    console.error('Error in filtering example:', error)
  }
}

/**
 * Example 5: Error handling with custom error types
 */
export async function errorHandlingExample() {
  try {
    // This will throw an error for unsupported chain
    const fetcher = EventFetcherFactory.getInstance(999)

  } catch (error) {
    const { EventFetcherError, EventFetcherErrorType } = await import('../index')

    if (error instanceof EventFetcherError) {
      console.log('Error type:', error.type)
      console.log('User-friendly message:', error.getUserFriendlyMessage())

      switch (error.type) {
        case EventFetcherErrorType.CHAIN_NOT_SUPPORTED:
          console.log('Please switch to a supported network')
          break
        case EventFetcherErrorType.CONTRACT_NOT_DEPLOYED:
          console.log('Contract not available on this network')
          break
        case EventFetcherErrorType.NETWORK_ERROR:
          console.log('Check your internet connection')
          break
        default:
          console.log('Unknown error occurred')
      }
    }
  }
}

/**
 * Example 6: Real-time usage pattern (for React components)
 */
export function reactUsageExample() {
  // This is how you would use EventFetcher in a React component

  const exampleReactHook = () => {
    // In a real React component, you would use useEffect and useState

    const fetchEvents = async (chainId: number, organizerAddress: `0x${string}`) => {
      try {
        const fetcher = EventFetcherFactory.getInstance(chainId)
        const events = await fetcher.fetchOrganizerEvents(organizerAddress)

        // Update component state with events
        return events

      } catch (error) {
        // Handle error in component
        console.error('Failed to fetch events:', error)
        return []
      }
    }

    const refreshEvents = async (chainId: number, organizerAddress: `0x${string}`) => {
      // Clear cache to force fresh data
      EventFetcherFactory.clearInstance(chainId)
      return await fetchEvents(chainId, organizerAddress)
    }

    return { fetchEvents, refreshEvents }
  }

  return exampleReactHook
}

/**
 * Example 7: Network switching handling
 */
export async function networkSwitchingExample() {
  try {
    // Start with Sepolia
    let fetcher = EventFetcherFactory.getInstance(11155111)
    const sepoliaEvents = await fetcher.fetchAllEvents({ limit: 5 })
    console.log(`Sepolia events: ${sepoliaEvents.length}`)

    // Switch to mainnet (if contract is deployed there)
    // EventFetcherFactory.updateChain(11155111, 1)
    // const mainnetFetcher = EventFetcherFactory.getInstance(1)
    // const mainnetEvents = await mainnetFetcher.fetchAllEvents({ limit: 5 })

    // Handle network switching in your app
    const handleNetworkSwitch = (oldChainId: number, newChainId: number) => {
      try {
        // Update the fetcher instance
        EventFetcherFactory.updateChain(oldChainId, newChainId)
        console.log(`Switched from chain ${oldChainId} to ${newChainId}`)

        // Fetch events for new network
        // ... your logic here

      } catch (error) {
        console.error('Failed to switch networks:', error)
      }
    }

    return { handleNetworkSwitch }

  } catch (error) {
    console.error('Error in network switching example:', error)
  }
}

// Export all examples for easy testing
export const examples = {
  basicEventFetchingExample,
  factoryPatternExample,
  batchFetchingExample,
  filteringAndSortingExample,
  errorHandlingExample,
  reactUsageExample,
  networkSwitchingExample,
}

// Helper function to run all examples
export async function runAllExamples() {
  console.log('=== EventFetcher Examples ===\n')

  console.log('1. Basic Event Fetching:')
  await basicEventFetchingExample()

  console.log('\n2. Factory Pattern:')
  await factoryPatternExample()

  console.log('\n3. Batch Fetching:')
  await batchFetchingExample()

  console.log('\n4. Filtering and Sorting:')
  await filteringAndSortingExample()

  console.log('\n5. Error Handling:')
  await errorHandlingExample()

  console.log('\n6. Network Switching:')
  await networkSwitchingExample()

  console.log('\n=== Examples Complete ===')
}
