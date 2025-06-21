"""
Flash Loan API Tools for AI Agent

This module contains secure implementations of flash loan API tools that integrate
with the actual backend API endpoints for the FlashLoanExecutor contract.

SECURITY NOTE: This implementation NEVER uses private keys in API calls.
All transaction operations require pre-signed transactions from the frontend.
Private keys should NEVER be sent to API endpoints.

The AI agent provides read-only analysis and guidance. Users must sign transactions
in their wallet through the frontend interface.
"""

import requests
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


class FlashLoanAPIClient:
    """
    Real API client for FlashLoanExecutor contract integration.
    Integrates with actual backend API routes without requiring private keys.
    """
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def get_contract_info(self) -> Dict[str, Any]:
        """
        Get contract information and safety parameters.
        Endpoint: GET /api/contracts/flash-loan/info
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/contracts/flash-loan/info",
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def get_strategies(
        self, 
        page: int = 1, 
        limit: int = 10, 
        creator: Optional[str] = None,
        active_only: bool = False
    ) -> Dict[str, Any]:
        """
        Get list of strategies with pagination.
        Endpoint: GET /api/contracts/flash-loan/strategies
        """
        try:
            params = {
                "page": page,
                "limit": limit,
                "activeOnly": active_only
            }
            if creator:
                params["creator"] = creator
            
            response = self.session.get(
                f"{self.base_url}/api/contracts/flash-loan/strategies",
                params=params,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def search_strategies(
        self,
        creator: Optional[str] = None,
        min_profit: Optional[int] = None,
        max_profit: Optional[int] = None,
        strategy_type: Optional[int] = None,
        active: Optional[bool] = None,
        search_term: Optional[str] = None,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Search strategies by specific criteria.
        Endpoint: POST /api/contracts/flash-loan/strategies
        """
        try:
            payload = {
                "creator": creator,
                "minProfit": min_profit,
                "maxProfit": max_profit,
                "strategyType": strategy_type,
                "active": active,
                "searchTerm": search_term,
                "sortBy": sort_by,
                "sortOrder": sort_order,
                "page": page,
                "limit": limit
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/strategies",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def get_strategy_by_id(self, strategy_id: int) -> Dict[str, Any]:
        """
        Get strategy details by ID.
        Endpoint: GET /api/contracts/flash-loan/strategy/{id}
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/contracts/flash-loan/strategy/{strategy_id}",
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def get_user_profit(self, strategy_id: int, user_address: str, token_address: str) -> Dict[str, Any]:
        """
        Get user's profit for a specific strategy.
        Endpoint: POST /api/contracts/flash-loan/strategy/{id}
        """
        try:
            payload = {
                "userAddress": user_address,
                "tokenAddress": token_address
            }
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/strategy/{strategy_id}",
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def execute_strategy_with_signed_tx(
        self, 
        signed_transaction: str, 
        user_address: str,
        strategy_id: int,
        assets: List[str],
        amounts: List[str]
    ) -> Dict[str, Any]:
        """
        Execute a strategy using a pre-signed transaction.
        Endpoint: POST /api/contracts/flash-loan/strategy/execute
        """
        try:
            payload = {
                "signedTransaction": signed_transaction,
                "userAddress": user_address,
                "strategyId": strategy_id,
                "assets": assets,
                "amounts": amounts
            }
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/strategy/execute",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}"),
                    "details": error_data.get("details")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def manage_strategy(
        self,
        signed_transaction: str,
        user_address: str,
        strategy_id: int,
        action: str,  # 'pause', 'resume', 'update'
        update_data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Manage strategy (pause, resume, update).
        Endpoint: POST /api/contracts/flash-loan/strategy/manage
        """
        try:
            payload = {
                "signedTransaction": signed_transaction,
                "userAddress": user_address,
                "strategyId": strategy_id,
                "action": action
            }
            
            if update_data:
                payload["updateData"] = update_data
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/strategy/manage",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def get_protocol_feature(
        self,
        feature: str,
        **params
    ) -> Dict[str, Any]:
        """
        Get protocol integration features.
        Endpoint: GET /api/contracts/flash-loan/protocol
        """
        try:
            query_params = {"feature": feature}
            query_params.update(params)
            
            response = self.session.get(
                f"{self.base_url}/api/contracts/flash-loan/protocol",
                params=query_params,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def batch_protocol_operations(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute batch protocol operations.
        Endpoint: POST /api/contracts/flash-loan/protocol
        """
        try:
            payload = {"operations": operations}
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/protocol",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def execute_admin_action(
        self,
        signed_transaction: str,
        user_address: str,
        admin_action: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute administrative actions.
        Endpoint: POST /api/contracts/flash-loan/admin
        """
        try:
            payload = {
                "signedTransaction": signed_transaction,
                "userAddress": user_address,
                "adminAction": admin_action
            }
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/admin",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def estimate_gas(
        self,
        operation: str,
        user_address: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Estimate gas for various operations.
        Endpoint: POST /api/contracts/flash-loan/gas-estimate
        """
        try:
            payload = {
                "operation": operation,
                "userAddress": user_address,
                "params": params
            }
            
            response = self.session.post(
                f"{self.base_url}/api/contracts/flash-loan/gas-estimate",
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
    
    def get_gas_info(self) -> Dict[str, Any]:
        """
        Get current gas information.
        Endpoint: GET /api/contracts/flash-loan/gas-estimate
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/contracts/flash-loan/gas-estimate",
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": error_data.get("error", f"HTTP {response.status_code}")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }

class FlashLoanAgentTools:
    """
    Agno-compatible wrapper for FlashLoanAPIClient to be used with AI agents.
    This class provides simplified methods that work without private keys.
    """
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.api_client = FlashLoanAPIClient(base_url)
    
    def get_contract_information(self) -> str:
        """
        Get comprehensive contract information and safety parameters.
        """
        result = self.api_client.get_contract_info()
        
        if result["success"]:
            data = result["data"]
            contract_info = data.get("contractInfo", {})
            safety_params = data.get("safetyParams", {})
            
            return f"📋 Flash Loan Executor Contract Information:\n" \
                   f"Contract Address: {contract_info.get('address', 'N/A')}\n" \
                   f"Owner: {contract_info.get('owner', 'N/A')}\n" \
                   f"Emergency Stop: {'🔴 Active' if contract_info.get('emergencyStop', False) else '🟢 Inactive'}\n" \
                   f"Next Strategy ID: {contract_info.get('nextStrategyId', 'N/A')}\n\n" \
                   f"Safety Parameters:\n" \
                   f"Max Slippage: {safety_params.get('maxSlippageBPS', 'N/A')} BPS\n" \
                   f"Min Profit: {safety_params.get('minProfitBPS', 'N/A')} BPS\n" \
                   f"Max Gas Price: {safety_params.get('maxGasPrice', 'N/A')} wei\n" \
                   f"Aave Pool: {contract_info.get('aavePool', 'N/A')}"
        else:
            return f"❌ Failed to get contract info: {result['error']}"
    
    def list_strategies(
        self, 
        page: int = 1, 
        limit: int = 10, 
        creator: Optional[str] = None,
        active_only: bool = False
    ) -> str:
        """
        List available strategies with pagination.
        """
        result = self.api_client.get_strategies(page, limit, creator, active_only)
        
        if result["success"]:
            data = result["data"]
            strategies = data.get("strategies", [])
            pagination = data.get("pagination", {})
            
            if not strategies:
                return "📝 No strategies found matching your criteria."
            
            strategy_list = f"📋 Strategies (Page {pagination.get('page', 1)} of {pagination.get('totalPages', 1)}):\n\n"
            
            for strategy in strategies:
                status = "🟢 Active" if strategy.get("active", False) else "🔴 Paused"
                strategy_list += f"Strategy ID: {strategy.get('id', 'N/A')}\n" \
                               f"Name: {strategy.get('name', 'Unnamed')}\n" \
                               f"Creator: {strategy.get('creator', 'N/A')[:8]}...\n" \
                               f"Status: {status}\n" \
                               f"Executions: {strategy.get('executionCount', 0)}\n" \
                               f"Total Profit: {strategy.get('totalProfit', '0')} wei\n" \
                               f"Actions: {strategy.get('actionCount', 0)}\n\n"
            
            strategy_list += f"Total: {pagination.get('total', 0)} strategies | " \
                           f"Showing {len(strategies)} results"
            
            return strategy_list
        else:
            return f"❌ Failed to list strategies: {result['error']}"
    
    def search_strategies(
        self,
        search_term: Optional[str] = None,
        creator: Optional[str] = None,
        min_profit: Optional[int] = None,
        active_only: bool = True
    ) -> str:
        """
        Search strategies by specific criteria.
        """
        result = self.api_client.search_strategies(
            creator=creator,
            min_profit=min_profit,
            active=active_only if active_only else None,
            search_term=search_term
        )
        
        if result["success"]:
            data = result["data"]
            strategies = data.get("results", [])
            
            if not strategies:
                return f"🔍 No strategies found for search term: '{search_term}'"
            
            search_results = f"🔍 Search Results for '{search_term}':\n\n"
            
            for strategy in strategies:
                status = "🟢 Active" if strategy.get("active", False) else "🔴 Paused"
                search_results += f"ID: {strategy.get('id')} | {strategy.get('name', 'Unnamed')}\n" \
                                f"Status: {status} | Profit: {strategy.get('totalProfit', '0')} wei\n" \
                                f"Creator: {strategy.get('creator', 'N/A')[:8]}...\n\n"
            
            return search_results
        else:
            return f"❌ Search failed: {result['error']}"
    
    def get_strategy_details(self, strategy_id: int) -> str:
        """
        Get detailed information about a specific strategy.
        """
        result = self.api_client.get_strategy_by_id(strategy_id)
        
        if result["success"]:
            data = result["data"]
            strategy = data.get("strategy", {})
            actions = data.get("actions", [])
            
            status = "🟢 Active" if strategy.get("active", False) else "🔴 Paused"
            
            details = f"📋 Strategy {strategy_id} Details:\n\n" \
                     f"Name: {strategy.get('name', 'Unnamed')}\n" \
                     f"Description: {strategy.get('description', 'No description')}\n" \
                     f"Creator: {strategy.get('creator', 'N/A')}\n" \
                     f"Status: {status}\n" \
                     f"Min Profit: {strategy.get('minProfitBPS', 'N/A')} BPS\n" \
                     f"Execution Count: {strategy.get('executionCount', 0)}\n" \
                     f"Total Profit: {strategy.get('totalProfit', '0')} wei\n" \
                     f"Created: {strategy.get('createdAt', 'N/A')}\n\n" \
                     f"Actions ({len(actions)}):\n"
            
            for i, action in enumerate(actions):
                details += f"{i+1}. Type: {action.get('actionType', 'Unknown')}\n" \
                          f"   Target: {action.get('target', 'N/A')[:8]}...\n" \
                          f"   Critical: {'Yes' if action.get('critical', False) else 'No'}\n" \
                          f"   Description: {action.get('description', 'No description')}\n\n"
            
            return details
        else:
            return f"❌ Failed to get strategy details: {result['error']}"
    
    def check_flash_loan_availability(self, token_address: str, amount_eth: float) -> str:
        """
        Check Aave flash loan availability for a specific token and amount.
        """
        result = self.api_client.get_protocol_feature(
            "flash-loan-check",
            asset=token_address,
            amount=str(int(amount_eth * 1e18))
        )
        
        if result["success"]:
            data = result["data"]
            available = "✅ Available" if data.get("available", False) else "❌ Not Available"
            fee_eth = int(data.get("fee", "0")) / 1e18
            fee_percentage = data.get("feePercentage", "0%")
            
            return f"🏦 Aave Flash Loan Availability:\n" \
                   f"Token: {token_address[:8]}...\n" \
                   f"Amount: {amount_eth} ETH\n" \
                   f"Status: {available}\n" \
                   f"Fee: {fee_eth:.6f} ETH ({fee_percentage})"
        else:
            return f"❌ Failed to check availability: {result['error']}"
    
    def get_dex_quote(
        self,
        token_in: str,
        token_out: str,
        amount_in_eth: float,
        dex_version: str = "v2"
    ) -> str:
        """
        Get price quote from Uniswap V2 or V3.
        """
        result = self.api_client.get_protocol_feature(
            f"{dex_version}-quote",
            tokenIn=token_in,
            tokenOut=token_out,
            amountIn=str(int(amount_in_eth * 1e18)),
            fee=3000 if dex_version == "v3" else None
        )
        
        if result["success"]:
            data = result["data"]
            amount_out_eth = int(data.get("amountOut", "0")) / 1e18
            price_impact = data.get("priceImpactPercent", "0%")
            
            return f"💱 Uniswap {dex_version.upper()} Quote:\n" \
                   f"Input: {amount_in_eth} ETH\n" \
                   f"Output: {amount_out_eth:.6f} tokens\n" \
                   f"Price Impact: {price_impact}"
        else:
            return f"❌ Failed to get {dex_version} quote: {result['error']}"
    
    def validate_strategy_profitability(
        self,
        expected_profit_eth: float,
        gas_estimate: int = 500000,
        gas_price_gwei: float = 20.0,
        min_profit_percent: float = 1.0,
        principal_eth: float = 1.0
    ) -> str:
        """
        Validate if a strategy would be profitable after gas costs.
        """
        result = self.api_client.get_protocol_feature(
            "profitability-check",
            expectedProfit=str(int(expected_profit_eth * 1e18)),
            gasEstimate=str(gas_estimate),
            gasPrice=str(int(gas_price_gwei * 1e9)),
            minProfitBPS=str(int(min_profit_percent * 100)),
            principalAmount=str(int(principal_eth * 1e18))
        )
        
        if result["success"]:
            data = result["data"]
            profitable = "✅ Profitable" if data.get("isProfitable", False) else "❌ Not Profitable"
            net_profit = int(data.get("netProfit", "0")) / 1e18
            profit_percent = data.get("profitPercent", "0%")
            
            return f"💰 Profitability Analysis:\n" \
                   f"Expected Profit: {expected_profit_eth} ETH\n" \
                   f"Gas Cost: {gas_estimate:,} units @ {gas_price_gwei} Gwei\n" \
                   f"Status: {profitable}\n" \
                   f"Net Profit: {net_profit:.6f} ETH ({profit_percent})"
        else:
            return f"❌ Failed to validate profitability: {result['error']}"
    
    def estimate_transaction_gas(
        self,
        operation: str,
        user_address: str,
        operation_params: Dict[str, Any]
    ) -> str:
        """
        Estimate gas cost for various operations.
        """
        result = self.api_client.estimate_gas(operation, user_address, operation_params)
        
        if result["success"]:
            data = result["data"]
            gas_estimate = data.get("gasEstimate", "0")
            gas_price = data.get("currentGasPrice", "0")
            cost_eth = int(gas_estimate) * int(gas_price) / 1e18 if gas_estimate != "0" and gas_price != "0" else 0
            
            return f"⛽ Gas Estimation for {operation}:\n" \
                   f"Estimated Gas: {gas_estimate:,} units\n" \
                   f"Current Gas Price: {int(gas_price) / 1e9:.1f} Gwei\n" \
                   f"Estimated Cost: {cost_eth:.6f} ETH"
        else:
            return f"❌ Failed to estimate gas: {result['error']}"
    
    def get_current_gas_info(self) -> str:
        """
        Get current network gas information.
        """
        result = self.api_client.get_gas_info()
        
        if result["success"]:
            data = result["data"]
            gas_price = int(data.get("currentGasPrice", "0")) / 1e9
            block_number = data.get("currentBlock", "N/A")
            base_fee = data.get("baseFeePerGas")
            
            info = f"⛽ Current Gas Information:\n" \
                   f"Gas Price: {gas_price:.1f} Gwei\n" \
                   f"Block Number: {block_number}\n"
            
            if base_fee:
                info += f"Base Fee: {int(base_fee) / 1e9:.1f} Gwei\n"
            
            return info
        else:
            return f"❌ Failed to get gas info: {result['error']}"
    
    def analyze_arbitrage_opportunity(
        self,
        token_pair: str = "WETH/USDC",
        amount_eth: float = 1.0
    ) -> str:
        """
        Analyze arbitrage opportunities between Uniswap V2 and V3.
        """
        # Default token addresses (can be customized)
        weth_address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        usdc_address = "0xA0b86a33E6441e13aB9907C7709e80d4f3eDb1e3"
        
        v2_quote = self.get_dex_quote(weth_address, usdc_address, amount_eth, "v2")
        v3_quote = self.get_dex_quote(weth_address, usdc_address, amount_eth, "v3")
        
        return f"🎯 Arbitrage Analysis for {token_pair}:\n" \
               f"Amount: {amount_eth} ETH\n\n" \
               f"{v2_quote}\n\n" \
               f"{v3_quote}\n\n" \
               f"💡 Compare the quotes above to identify arbitrage opportunities.\n" \
               f"Look for significant price differences between V2 and V3."


# Standalone functions for agno AI agent integration
def get_contract_info() -> str:
    """Get flash loan contract information."""
    tools = FlashLoanAgentTools()
    return tools.get_contract_information()


def list_available_strategies(
    page: int = 1, 
    limit: int = 10, 
    creator: Optional[str] = None,
    active_only: bool = False
) -> str:
    """List available flash loan strategies."""
    tools = FlashLoanAgentTools()
    return tools.list_strategies(page, limit, creator, active_only)


def search_strategies(
    search_term: Optional[str] = None,
    creator: Optional[str] = None,
    min_profit: Optional[int] = None,
    active_only: bool = True
) -> str:
    """Search for strategies by criteria."""
    tools = FlashLoanAgentTools()
    return tools.search_strategies(search_term, creator, min_profit, active_only)


def get_strategy_details(strategy_id: int) -> str:
    """Get detailed information about a specific strategy."""
    tools = FlashLoanAgentTools()
    return tools.get_strategy_details(strategy_id)


def check_flash_loan_availability(token_address: str, amount_eth: float) -> str:
    """Check if flash loan is available for a token."""
    tools = FlashLoanAgentTools()
    return tools.check_flash_loan_availability(token_address, amount_eth)


def get_uniswap_quote(
    token_in: str,
    token_out: str,
    amount_in_eth: float,
    version: str = "v2"
) -> str:
    """Get Uniswap price quote."""
    tools = FlashLoanAgentTools()
    return tools.get_dex_quote(token_in, token_out, amount_in_eth, version)


def validate_profitability(
    expected_profit_eth: float,
    gas_estimate: int = 500000,
    gas_price_gwei: float = 20.0,
    min_profit_percent: float = 1.0,
    principal_eth: float = 1.0
) -> str:
    """Validate strategy profitability after gas costs."""
    tools = FlashLoanAgentTools()
    return tools.validate_strategy_profitability(
        expected_profit_eth, gas_estimate, gas_price_gwei, min_profit_percent, principal_eth
    )


def estimate_gas_cost(
    operation: str,
    user_address: str,
    **operation_params
) -> str:
    """Estimate gas cost for operations."""
    tools = FlashLoanAgentTools()
    return tools.estimate_transaction_gas(operation, user_address, operation_params)


def get_gas_info() -> str:
    """Get current network gas information."""
    tools = FlashLoanAgentTools()
    return tools.get_current_gas_info()


def analyze_arbitrage_opportunity(
    token_pair: str = "WETH/USDC",
    amount_eth: float = 1.0
) -> str:
    """Analyze arbitrage opportunities between DEXs."""
    tools = FlashLoanAgentTools()
    return tools.analyze_arbitrage_opportunity(token_pair, amount_eth)


def monitor_strategy_performance(strategy_id: int) -> str:
    """Monitor strategy performance and execution history."""
    tools = FlashLoanAgentTools()
    details = tools.get_strategy_details(strategy_id)
    gas_info = tools.get_current_gas_info()
    
    return f"📊 Strategy {strategy_id} Performance Monitor:\n\n" \
           f"{details}\n\n" \
           f"Current Network Conditions:\n{gas_info}\n\n" \
           f"💡 To execute this strategy, you'll need to:\n" \
           f"1. Connect your wallet\n" \
           f"2. Sign the transaction\n" \
           f"3. Submit via the frontend or API"


def get_market_conditions() -> str:
    """Get current market conditions relevant to flash loans."""
    tools = FlashLoanAgentTools()
    gas_info = tools.get_current_gas_info()
    
    # Check availability for common tokens
    weth_availability = tools.check_flash_loan_availability(
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 10.0
    )
    
    return f"📈 Current Market Conditions:\n\n" \
           f"Network Status:\n{gas_info}\n\n" \
           f"Flash Loan Availability (10 ETH sample):\n{weth_availability}\n\n" \
           f"💡 Use this information to assess optimal execution timing."


# Create global instances for easy access
flash_loan_api_client = FlashLoanAPIClient()
flash_loan_agent_tools = FlashLoanAgentTools()


# Agno-compatible tool class with simplified, secure methods
class FlashLoanTools_Agno:
    """
    Secure wrapper class for agno framework integration.
    These tools work with your actual API routes without requiring private keys.
    """
    
    # Information and Analysis Tools (No transaction signing required)
    get_contract_info = staticmethod(get_contract_info)
    list_available_strategies = staticmethod(list_available_strategies)
    search_strategies = staticmethod(search_strategies)
    get_strategy_details = staticmethod(get_strategy_details)
    
    # Protocol Integration Tools (Read-only)
    check_flash_loan_availability = staticmethod(check_flash_loan_availability)
    get_uniswap_quote = staticmethod(get_uniswap_quote)
    validate_profitability = staticmethod(validate_profitability)
    
    # Gas and Network Analysis Tools
    estimate_gas_cost = staticmethod(estimate_gas_cost)
    get_gas_info = staticmethod(get_gas_info)
    
    # Market Analysis Tools
    analyze_arbitrage_opportunity = staticmethod(analyze_arbitrage_opportunity)
    monitor_strategy_performance = staticmethod(monitor_strategy_performance)
    get_market_conditions = staticmethod(get_market_conditions)


# Create instance for agno integration
flash_loan_agno_tools = FlashLoanTools_Agno()


# Configuration for different environments
class APIConfig:
    """
    Configuration class for different deployment environments.
    """
    
    LOCALHOST = "http://localhost:3000"
    DEVELOPMENT = "https://dev-api.yourproject.com"
    STAGING = "https://staging-api.yourproject.com"
    PRODUCTION = "https://api.yourproject.com"
    
    @classmethod
    def get_client(cls, environment: str = "localhost") -> FlashLoanAPIClient:
        """
        Get API client for specific environment.
        """
        env_urls = {
            "localhost": cls.LOCALHOST,
            "development": cls.DEVELOPMENT,
            "staging": cls.STAGING,
            "production": cls.PRODUCTION
        }
        
        base_url = env_urls.get(environment.lower(), cls.LOCALHOST)
        return FlashLoanAPIClient(base_url)


# Usage guide for AI Agent integration
USAGE_GUIDE = """
🤖 AI Agent Integration Guide

SECURITY MODEL:
- ✅ These tools work with your actual API routes
- ✅ NO private keys required for analysis functions
- ✅ Users must sign transactions in their own wallet/frontend
- ✅ Agent provides analysis and recommendations only

AVAILABLE TOOLS:
1. get_contract_info() - Get contract status and parameters
2. list_available_strategies() - Browse available strategies  
3. search_strategies() - Search strategies by criteria
4. get_strategy_details() - Get detailed strategy information
5. check_flash_loan_availability() - Check Aave flash loan status
6. get_uniswap_quote() - Get DEX price quotes
7. validate_profitability() - Analyze profit potential
8. estimate_gas_cost() - Estimate transaction costs
9. analyze_arbitrage_opportunity() - Find arbitrage opportunities
10. monitor_strategy_performance() - Track strategy metrics

AGENT WORKFLOW:
1. Agent analyzes user request
2. Agent calls appropriate tools for market data/analysis  
3. Agent provides recommendations and insights
4. User decides whether to proceed
5. User signs transaction in their wallet
6. User submits via frontend (not through agent)

EXAMPLE CONVERSATIONS:
User: "Show me profitable arbitrage strategies"
Agent: [calls list_available_strategies, analyze_arbitrage_opportunity]

User: "Is strategy 123 worth executing with current gas prices?"
Agent: [calls get_strategy_details, validate_profitability, get_gas_info]

User: "Check if I can flash loan 5 ETH from Aave"  
Agent: [calls check_flash_loan_availability]

This approach maintains security while providing powerful analysis capabilities!
"""