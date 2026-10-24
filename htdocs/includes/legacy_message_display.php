<?php
/** Display-only grammar for the old system log format. Never a general HTML sink. */
if (!function_exists('andromedaRenderLegacySystemMessage')) {
    function andromedaRenderLegacySystemMessage($message): string
    {
        // Decode one historical storage layer only. Every resulting token must
        // still pass the exact grammar below; no stored HTML is trusted.
        $text = html_entity_decode((string)$message, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
        if ($clean === null) {
            return nl2br(htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);
        }
        $tokens = preg_split('/(<[^>]*>)/u', $clean, -1, PREG_SPLIT_DELIM_CAPTURE);
        if ($tokens === false) {
            return nl2br(htmlspecialchars($clean, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);
        }
        $result = '';
        $stack = [];
        foreach ($tokens as $token) {
            if (preg_match('/\A<b\s*>\z/i', $token)) {
                $result .= '<b>';
                $stack[] = 'b';
            } elseif (preg_match('/\A<font\s+color\s*=\s*([\'"])(#[0-9a-f]{6})\1\s*>\z/i', $token, $match)) {
                $result .= '<span class="legacy-message-color" style="color:'.strtoupper($match[2]).'">';
                $stack[] = 'font';
            } elseif (preg_match('/\A<br\s*\/?\s*>\z/i', $token)) {
                $result .= '<br>';
            } elseif (preg_match('/\A<\/(b|font)\s*>\z/i', $token, $match)
                && count($stack) && end($stack) === strtolower($match[1])) {
                $result .= array_pop($stack) === 'b' ? '</b>' : '</span>';
            } else {
                $result .= nl2br(htmlspecialchars($token, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);
            }
        }
        while ($stack) {
            $result .= array_pop($stack) === 'b' ? '</b>' : '</span>';
        }
        return $result;
    }
}
