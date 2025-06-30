import React, { useState } from 'react';
import { Button, Card, Text, Box, Flex } from '@radix-ui/themes';
import { FiPlay, FiInfo, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'sonner';

interface DebugResults {
  [key: string]: any;
}

export const FirebaseDebugPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebugResults | null>(null);

  const callAPI = async (endpoint: string, label: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/method/raven.api.firebase_debug.${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).frappe?.csrf_token || ''
        }
      });
      
      const result = await response.json();
      
      setResults(prev => ({
        ...prev,
        [endpoint]: result
      }));
      
      if (result.message?.success) {
        toast.success(`${label} thành công!`);
      } else {
        toast.error(`${label} thất bại: ${result.message?.error || 'Unknown error'}`);
      }
      
      console.log(`${label} result:`, result);
      
    } catch (error) {
      console.error(`${label} error:`, error);
      toast.error(`${label} lỗi: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const formatResult = (result: any) => {
    if (!result) return null;
    
    return (
      <Box className="mt-2 p-3 bg-gray-50 rounded text-xs">
        <pre className="whitespace-pre-wrap overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      </Box>
    );
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <FiCheckCircle className="text-green-600" size={16} /> : 
      <FiXCircle className="text-red-600" size={16} />;
  };

  return (
    <Card className="p-4 max-w-4xl mx-auto">
      <Flex align="center" gap="2" className="mb-4">
        <FiInfo size={20} />
        <Text size="4" weight="bold">🔥 Firebase Debug Panel</Text>
      </Flex>
      
      <Text size="2" color="gray" className="mb-4">
        Panel debug để kiểm tra Firebase integration. Check console để xem chi tiết.
      </Text>

      <div className="space-y-4">
        {/* Debug Firebase Status */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">1. Kiểm tra Firebase Status</Text>
            <Button
              size="1"
              variant="soft"
              onClick={() => callAPI('debug_firebase_status', 'Firebase Status Check')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Check Status
            </Button>
          </Flex>
          
          {results?.debug_firebase_status && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.debug_firebase_status.message?.success)}
              <Text size="1" color={results.debug_firebase_status.message?.success ? "green" : "red"}>
                {results.debug_firebase_status.message?.success ? 
                  `✅ Firebase OK - ${results.debug_firebase_status.message.status?.tokens_count || 0} tokens` : 
                  `❌ Error: ${results.debug_firebase_status.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.debug_firebase_status)}
        </div>

        {/* Test Send Notification */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">2. Gửi Test Notification</Text>
            <Button
              size="1"
              variant="soft"
              color="orange"
              onClick={() => callAPI('debug_send_test_notification', 'Send Test Notification')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Send Test
            </Button>
          </Flex>
          
          {results?.debug_send_test_notification && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.debug_send_test_notification.message?.success)}
              <Text size="1" color={results.debug_send_test_notification.message?.success ? "green" : "red"}>
                {results.debug_send_test_notification.message?.success ? 
                  `✅ Sent to ${results.debug_send_test_notification.message.user}` : 
                  `❌ Error: ${results.debug_send_test_notification.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.debug_send_test_notification)}
        </div>

        {/* Check Integration */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">3. Kiểm tra RavenMessage Integration</Text>
            <Button
              size="1"
              variant="soft"
              color="blue"
              onClick={() => callAPI('debug_raven_message_integration', 'Check Integration')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Check Integration
            </Button>
          </Flex>
          
          {results?.debug_raven_message_integration && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.debug_raven_message_integration.message?.success)}
              <Text size="1" color={results.debug_raven_message_integration.message?.success ? "green" : "red"}>
                {results.debug_raven_message_integration.message?.success ? 
                  `✅ Integration: ${results.debug_raven_message_integration.message.raven_message_patched ? 'Patched' : 'Not patched'}` : 
                  `❌ Error: ${results.debug_raven_message_integration.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.debug_raven_message_integration)}
        </div>

        {/* Detailed Firebase Debug */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">4. 🔥 Debug Firebase Messaging Chi Tiết</Text>
            <Button
              size="1"
              variant="soft"
              color="red"
              onClick={() => callAPI('debug_firebase_detailed', 'Detailed Firebase Debug')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Deep Debug
            </Button>
          </Flex>
          
          {results?.debug_firebase_detailed && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.debug_firebase_detailed.message?.success)}
              <Text size="1" color={results.debug_firebase_detailed.message?.success ? "green" : "red"}>
                {results.debug_firebase_detailed.message?.success ? 
                  `🔥 Firebase Admin: ${results.debug_firebase_detailed.message.debug_info?.direct_send_success ? 'WORKING' : 'FAILED'}` : 
                  `❌ Error: ${results.debug_firebase_detailed.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.debug_firebase_detailed)}
        </div>

        {/* Manual Firebase Test */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">5. 🎯 Test Manual Firebase Send</Text>
            <Button
              size="1"
              variant="soft"
              color="amber"
              onClick={() => callAPI('test_manual_firebase_send', 'Manual Firebase Test')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Manual Test
            </Button>
          </Flex>
          
          {results?.test_manual_firebase_send && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.test_manual_firebase_send.message?.success)}
              <Text size="1" color={results.test_manual_firebase_send.message?.success ? "green" : "red"}>
                {results.test_manual_firebase_send.message?.success ? 
                  `🎯 Manual test: ${results.test_manual_firebase_send.message.message}` : 
                  `❌ Error: ${results.test_manual_firebase_send.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.test_manual_firebase_send)}
        </div>

        {/* Check Patch Status */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">6. 🔧 Kiểm tra Patch Status</Text>
            <Button
              size="1"
              variant="soft"
              color="cyan"
              onClick={() => callAPI('check_patch_status', 'Check Patch Status')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Check Patch
            </Button>
          </Flex>
          
          {results?.check_patch_status && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.check_patch_status.message?.success)}
              <Text size="1" color={results.check_patch_status.message?.success ? "green" : "red"}>
                {results.check_patch_status.message?.success ? 
                  `🔧 Patch: ${results.check_patch_status.message.patch_info?.method_contains_firebase ? 'Applied' : 'Not Applied'}` : 
                  `❌ Error: ${results.check_patch_status.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.check_patch_status)}
        </div>

        {/* Test Real Message */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">7. 🧪 Test Message Thật</Text>
            <Button
              size="1"
              variant="soft"
              color="green"
              onClick={() => callAPI('test_real_message_notification', 'Test Real Message')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Send Real Message
            </Button>
          </Flex>
          
          {results?.test_real_message_notification && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.test_real_message_notification.message?.success)}
              <Text size="1" color={results.test_real_message_notification.message?.success ? "green" : "red"}>
                {results.test_real_message_notification.message?.success ? 
                  `🧪 Message: ${results.test_real_message_notification.message.message_id}` : 
                  `❌ Error: ${results.test_real_message_notification.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.test_real_message_notification)}
        </div>

        {/* Get Recent Logs */}
        <div>
          <Flex justify="between" align="center" className="mb-2">
            <Text weight="medium">8. 📝 Xem Firebase Logs Gần Đây</Text>
            <Button
              size="1"
              variant="soft"
              color="purple"
              onClick={() => callAPI('get_recent_firebase_logs', 'Get Firebase Logs')}
              disabled={loading}
            >
              <FiPlay size={12} />
              Get Logs
            </Button>
          </Flex>
          
          {results?.get_recent_firebase_logs && (
            <Flex align="center" gap="2">
              {getStatusIcon(results.get_recent_firebase_logs.message?.success)}
              <Text size="1" color={results.get_recent_firebase_logs.message?.success ? "green" : "red"}>
                {results.get_recent_firebase_logs.message?.success ? 
                  `📝 Logs: ${results.get_recent_firebase_logs.message.total_lines} lines` : 
                  `❌ Error: ${results.get_recent_firebase_logs.message?.error}`
                }
              </Text>
            </Flex>
          )}
          
          {formatResult(results?.get_recent_firebase_logs)}
        </div>

        {/* Clear Results */}
        <div className="pt-4 border-t">
          <Button
            size="1"
            variant="outline"
            color="gray"
            onClick={() => setResults(null)}
          >
            Clear Results
          </Button>
        </div>
      </div>
    </Card>
  );
}; 