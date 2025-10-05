import './App.css'
import WalletConnection from './components/WalletConnection'
import NetworkSwitcher from './components/NetworkSwitcher'
import ContractStatus from './components/ContractStatus'
import NotificationCenter from './components/NotificationCenter'
import Events from './pages/Events'
import MyTickets from './pages/MyTickets'
import OrganizerDashboard from './pages/OrganizerDashboard'
import AdminPanel from './pages/AdminPanel'
import { useWallet } from './hooks/useWallet'
import { useOrganizerRole } from './hooks/useOrganizerRole'
import { useAdminRole } from './hooks/useAdminRole'
import { useContractEvents } from './hooks/useContractEvents'
import { useNotifications } from './hooks/useNotifications'
import { useState, useEffect } from 'react'
import { formatEther } from './utils'

function App() {
  const { isConnected, isCorrectNetwork } = useWallet()
  const { isOrganizer } = useOrganizerRole()
  const { isAdmin } = useAdminRole()
  const { events: contractEvents, isListening } = useContractEvents()
  const { addSuccess, addInfo, addWarning } = useNotifications()
  const [currentPage, setCurrentPage] = useState<'home' | 'events' | 'tickets' | 'organizer' | 'admin'>('home')

  const showEvents = isConnected && isCorrectNetwork

  // Handle real-time contract events
  useEffect(() => {
    if (contractEvents.length === 0) return

    const latestEvent = contractEvents[0]
    
    switch (latestEvent.type) {
      case 'EventCreated':
        addInfo(
          'New Event Created',
          `"${latestEvent.data.name}" is now available for ticket purchases!`,
          {
            label: 'View Events',
            onClick: () => setCurrentPage('events')
          }
        )
        break
        
      case 'TicketPurchased':
        addSuccess(
          'Ticket Purchased',
          `Ticket #${latestEvent.data.ticketNumber} purchased for ${formatEther(latestEvent.data.price)} ETH`,
          {
            label: 'View My Tickets',
            onClick: () => setCurrentPage('tickets')
          }
        )
        break
        
      case 'EventStatusChanged':
        const statusNames = ['Active', 'Paused', 'Cancelled', 'Completed']
        const newStatus = statusNames[latestEvent.data.newStatus] || 'Unknown'
        addWarning(
          'Event Status Changed',
          `Event status updated to: ${newStatus}`,
          {
            label: 'View Events',
            onClick: () => setCurrentPage('events')
          }
        )
        break
        
      case 'RevenueWithdrawn':
        addSuccess(
          'Revenue Withdrawn',
          `${formatEther(latestEvent.data.amount)} ETH withdrawn successfully`,
          {
            label: 'View Dashboard',
            onClick: () => setCurrentPage('organizer')
          }
        )
        break
    }
  }, [contractEvents, addSuccess, addInfo, addWarning, setCurrentPage])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <h1 
                className="text-2xl font-bold text-gray-800 cursor-pointer"
                onClick={() => setCurrentPage('home')}
              >
                Ingressos
              </h1>
              
              {showEvents && (
                <nav className="flex space-x-6">
                  <button
                    onClick={() => setCurrentPage('home')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'home'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setCurrentPage('events')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'events'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Events
                  </button>
                  <button
                    onClick={() => setCurrentPage('tickets')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === 'tickets'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Tickets
                  </button>
                  {isOrganizer && (
                    <button
                      onClick={() => setCurrentPage('organizer')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 'organizer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Organizer
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setCurrentPage('admin')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Admin
                    </button>
                  )}
                </nav>
              )}
            </div>
            
            <WalletConnection />
          </div>
        </div>
      </nav>

      {/* Network status */}
      {isConnected && !isCorrectNetwork && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-3">
            <NetworkSwitcher />
          </div>
        </div>
      )}

      {/* Main content */}
      {currentPage === 'events' && showEvents ? (
        <Events />
      ) : currentPage === 'tickets' && showEvents ? (
        <MyTickets />
      ) : currentPage === 'organizer' && showEvents ? (
        <OrganizerDashboard />
      ) : currentPage === 'admin' && showEvents ? (
        <AdminPanel />
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            {!isConnected ? (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Welcome to Ingressos NFT Ticketing
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Connect your wallet to start browsing events and purchasing tickets.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm max-w-2xl mx-auto">
                  <div className="bg-blue-50 p-3 rounded">
                    <strong>Secure</strong><br/>
                    Blockchain-based tickets
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <strong>Transferable</strong><br/>
                    NFT ticket ownership
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <strong>Verifiable</strong><br/>
                    Authentic tickets only
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <strong>Decentralized</strong><br/>
                    No middleman fees
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  🎉 Wallet Connected Successfully!
                </h2>
                <p className="text-lg text-gray-600 mb-4">
                  You're ready to explore events and purchase tickets.
                </p>
                
                {isCorrectNetwork && (
                  <div className="mt-8 space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">
                        ✅ Connected to supported network
                      </p>
                      <p className="text-green-600 text-sm mt-1">
                        Ready for smart contract interactions
                      </p>
                    </div>
                    
                    <ContractStatus />
                    
                    <div className="pt-4">
                      <button
                        onClick={() => setCurrentPage('events')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Browse Events
                      </button>
                    </div>
                  </div>
                )}
                
                {!isCorrectNetwork && (
                  <div className="mt-8">
                    <NetworkSwitcher />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Center */}
      <NotificationCenter />

      {/* Real-time Status Indicator */}
      {isConnected && isCorrectNetwork && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
            isListening 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            {isListening ? 'Live Updates Active' : 'Updates Paused'}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
