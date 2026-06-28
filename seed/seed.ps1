# SupportPilot seed script (PowerShell) - populates knowledge base and demo tickets
# Run after pod is imported:  pwsh -File seed/seed.ps1   (or)   powershell -File seed\seed.ps1
$ErrorActionPreference = "Stop"
$POD = if ($env:LEMMA_POD) { $env:LEMMA_POD } else { "supportpilot" }
Write-Host "Seeding pod: $POD"

$tmp = Join-Path $env:TEMP "supportpilot-seed"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function New-Record($table, $obj) {
  $file = Join-Path $tmp ("rec_" + [guid]::NewGuid().ToString("N") + ".json")
  $json = $obj | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText($file, $json, (New-Object System.Text.UTF8Encoding $false))
  lemma record create $table --file $file --pod $POD
}

# ── Knowledge base articles ──────────────────────────────────────────────────
Write-Host "Seeding knowledge base..."

$kb = @(
  @{ title = "How to reset your password";
     content = "To reset your password:`n1. Go to the login page and click `"Forgot password`"`n2. Enter your registered email address`n3. Check your inbox for a reset link (check spam if not seen within 2 minutes)`n4. Click the link and set a new password (min 8 characters, must include a number)`n5. If the link has expired (valid for 24h), request a new one`n`nIf you do not receive the email, ensure you are using the email address you signed up with. Contact support if the issue persists.";
     category = "account"; tags = @("password","auth","login","account"); is_active = $true; usage_count = 0 },
  @{ title = "How to upgrade or downgrade your plan";
     content = "To change your subscription plan:`n1. Go to Settings -> Billing -> Plan`n2. Click `"Change plan`"`n3. Select your new plan and confirm`n4. Upgrades take effect immediately. You are charged a prorated amount for the rest of the billing cycle.`n5. Downgrades take effect at the start of your next billing cycle.`n`nPlan details:`n- Free: up to 3 projects, 1 GB storage`n- Starter (`$19/mo): up to 10 projects, 10 GB storage`n- Pro (`$49/mo): unlimited projects, 100 GB, priority support`n- Enterprise: custom pricing, dedicated support, SLA";
     category = "billing"; tags = @("billing","plan","upgrade","downgrade","subscription"); is_active = $true; usage_count = 0 },
  @{ title = "How to request a refund";
     content = "Refund policy:`n- We offer a 30-day money-back guarantee on all paid plans`n- To request a refund, contact support with your account email and reason`n- Refunds are processed within 5-7 business days to your original payment method`n- Partial refunds are available on a case-by-case basis for annual plans`n- We do not offer refunds after 30 days of purchase`n`nTo initiate a refund, reply to this message with your account email and we will process it immediately.";
     category = "billing"; tags = @("refund","billing","money-back","cancel"); is_active = $true; usage_count = 0 },
  @{ title = "API rate limits and how to handle 429 errors";
     content = "Our API enforces rate limits to ensure fair usage:`n`nDefault limits (per API key):`n- Free: 100 requests/minute, 1,000 requests/day`n- Starter: 500 requests/minute, 10,000 requests/day`n- Pro: 2,000 requests/minute, unlimited/day`n- Enterprise: custom`n`nHandling 429 Too Many Requests:`n1. Check the Retry-After header in the response - wait that many seconds before retrying`n2. Implement exponential backoff: wait 1s, then 2s, then 4s, etc.`n3. Cache responses where possible to reduce request count`n4. Contact us to discuss higher limits if you consistently hit them";
     category = "bug"; tags = @("api","rate-limit","429","error","developer"); is_active = $true; usage_count = 0 },
  @{ title = "How to export your data";
     content = "You can export all your data at any time:`n`n1. Go to Settings -> Account -> Data Export`n2. Click `"Request export`"`n3. You will receive an email within 1 hour with a download link`n4. The export includes: all your projects, records, files, and activity history`n5. Export format: ZIP containing JSON files and attachments`n6. Download links expire after 7 days`n`nFor GDPR data deletion requests, please email privacy@yourapp.com with your account email. We will process requests within 30 days.";
     category = "how_to"; tags = @("export","data","gdpr","download","backup"); is_active = $true; usage_count = 0 },
  @{ title = "Setting up team members and permissions";
     content = "To invite team members:`n1. Go to Settings -> Team -> Invite members`n2. Enter email addresses (comma-separated for bulk invite)`n3. Select a role: Viewer, Editor, or Admin`n4. Click Send invites`n`nRole permissions:`n- Viewer: can view all content, cannot edit or create`n- Editor: can create, edit, and delete their own content`n- Admin: full access including billing and member management`n`nThe free plan supports 1 member. Starter includes up to 5 members. Pro includes up to 20. Enterprise is unlimited.";
     category = "how_to"; tags = @("team","members","permissions","invite","roles"); is_active = $true; usage_count = 0 },
  @{ title = "File upload limits and supported formats";
     content = "File upload limits by plan:`n- Free: 10 MB per file, 1 GB total`n- Starter: 50 MB per file, 10 GB total`n- Pro: 500 MB per file, 100 GB total`n- Enterprise: custom`n`nSupported file types:`n- Documents: PDF, DOCX, XLSX, PPTX, TXT, CSV, MD`n- Images: JPG, PNG, GIF, SVG, WebP`n- Audio: MP3, WAV, M4A`n- Video: MP4, MOV, WebM (Pro and above)`n- Archives: ZIP, TAR.GZ (contents are not indexed)`n`nTo increase your storage limit, upgrade your plan or contact us for add-on storage.";
     category = "how_to"; tags = @("file","upload","storage","format","limit"); is_active = $true; usage_count = 0 }
)
foreach ($a in $kb) { New-Record "knowledge_base" $a }

# ── Demo tickets ─────────────────────────────────────────────────────────────
Write-Host "Seeding demo tickets..."

$tickets = @(
  @{ subject = "Cannot login to my account - password reset not working";
     body = "Hi,`n`nI have been trying to login to my account for the past hour and I keep getting `"invalid credentials`" even though I am sure the password is correct. I tried the password reset but the email never arrives (I have checked spam).`n`nMy email is john.doe@example.com`n`nThis is quite urgent as I have a client presentation in 2 hours and all my work is in the app.`n`nPlease help ASAP!`n`nThanks,`nJohn";
     customer_email = "john.doe@example.com"; customer_name = "John Doe"; source = "web"; status = "new" },
  @{ subject = "Charged twice for February subscription";
     body = "Hello,`n`nI noticed that I was charged twice on my credit card for February. The charges are:`n- Feb 1: `$49.00 (correct)`n- Feb 3: `$49.00 (duplicate)`n`nPlease refund the duplicate charge. My account email is sarah.wilson@example.com.`n`nBest,`nSarah Wilson";
     customer_email = "sarah.wilson@example.com"; customer_name = "Sarah Wilson"; source = "email"; status = "new" },
  @{ subject = "How do I export my project data?";
     body = "Hi support team,`n`nI need to export all my project data for a backup. Can you tell me how to do this?`n`nThanks";
     customer_email = "alex.kim@example.com"; customer_name = "Alex Kim"; source = "web"; status = "new" }
)
foreach ($t in $tickets) { New-Record "tickets" $t }

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Seeding complete."

