# Copyright (c) 2026 ShadowAssist. All rights reserved.

# Visible top-level windows: Microsoft Teams (desktop / WebView2 / browser) and Google Meet.

# Used when the foreground window is not the meeting app (e.g. overlay has focus).



$ErrorActionPreference = 'SilentlyContinue'



Add-Type -ReferencedAssemblies System.Management -Language CSharp -TypeDefinition @'

using System;

using System.Diagnostics;

using System.IO;

using System.Management;

using System.Runtime.InteropServices;

using System.Text;

using System.Text.RegularExpressions;



public static class SaVisibleMeetingScan {

  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr p);

  delegate bool EnumProc(IntPtr h, IntPtr lp);

  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int m);

  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);



  static readonly Regex RxCode = new Regex("\\b[a-z]{3}-[a-z]{4}-[a-z]{3}\\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

  static readonly Regex RxMeetLead = new Regex("^meet\\s*[-\\u2013\\u2014]", RegexOptions.IgnoreCase | RegexOptions.Compiled);

  static readonly Regex RxCodeOnly = new Regex("^[a-z]{3}-[a-z]{4}-[a-z]{3}$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

  static readonly Regex RxTeamsUrl = new Regex("\\bteams\\.(microsoft|live)\\.com\\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);



  static bool LooksLikeMeet(string t, string proc) {

    if (string.IsNullOrWhiteSpace(t)) return false;

    string s = t;

    string trim = s.Trim();

    string p = (proc ?? "").ToLowerInvariant().Replace(".exe", "");

    if (s.IndexOf("meet.google", StringComparison.OrdinalIgnoreCase) >= 0) return true;

    if (Regex.IsMatch(s, "\\bgoogle meet\\b", RegexOptions.IgnoreCase)) return true;

    if (RxMeetLead.IsMatch(trim)) return true;

    if (Regex.IsMatch(trim, "\\|\\s*Google Meet\\s*$", RegexOptions.IgnoreCase)) return true;

    if (Regex.IsMatch(trim, "\\s[-\\u2013\\u2014|]\\s*Google Meet\\s*$", RegexOptions.IgnoreCase)) return true;

    if (RxCode.IsMatch(s) && Regex.IsMatch(s, "\\bmeet\\b", RegexOptions.IgnoreCase)) return true;

    if (RxCodeOnly.IsMatch(trim)) return true;

    if (p == "chrome_proxy" || p == "msedge_proxy") {

      if (Regex.IsMatch(trim, "^google meet(\\s*[-\\u2013\\u2014|]|$)", RegexOptions.IgnoreCase)) return true;

      if (Regex.IsMatch(trim, "^in call\\b", RegexOptions.IgnoreCase)) return true;

    }

    return false;

  }



  static bool TeamsTitleHint(string t) {

    if (string.IsNullOrWhiteSpace(t)) return false;

    if (t.IndexOf("microsoft teams", StringComparison.OrdinalIgnoreCase) >= 0) return true;

    if (RxTeamsUrl.IsMatch(t)) return true;

    if (Regex.IsMatch(t, "\\|\\s*Microsoft Teams\\b", RegexOptions.IgnoreCase)) return true;

    if (Regex.IsMatch(t, "^Microsoft Teams\\s*\\|", RegexOptions.IgnoreCase)) return true;

    return false;

  }



  static bool IsBrowserExe(string exe) {

    if (string.IsNullOrEmpty(exe)) return false;

    switch (exe.ToLowerInvariant()) {

      case "chrome": case "chrome_proxy": case "msedge": case "msedge_proxy": case "brave": case "opera": case "vivaldi":

      case "firefox": case "waterfox": case "zen": case "arc":

        return true;

      default: return false;

    }

  }



  static bool IsTeamsCoreExe(string exe) {

    if (string.IsNullOrEmpty(exe)) return false;

    switch (exe.ToLowerInvariant()) {

      case "ms-teams": case "teams": case "msteams":

        return true;

      default: return false;

    }

  }



  static string ResolveExeFromPid(uint pidInit) {

    int pid = (int)pidInit;

    if (pid <= 0) return "";
    string browserCandidate = "";

    for (int step = 0; step < 18 && pid > 0; step++) {

      try {

        using (var q = new ManagementObjectSearcher("SELECT Name,ParentProcessId FROM Win32_Process WHERE ProcessId=" + pid)) {

          foreach (ManagementObject mo in q.Get()) {

            string name = mo["Name"] as string ?? "";

            string exe = Path.GetFileNameWithoutExtension(name);

            if (string.IsNullOrEmpty(exe)) break;

            string low = exe.ToLowerInvariant();

            if (IsTeamsCoreExe(low)) return low;

            if (IsBrowserExe(low) && string.IsNullOrEmpty(browserCandidate)) browserCandidate = low;

            if ((low == "chrome_proxy" || low == "msedge_proxy") && string.IsNullOrEmpty(browserCandidate)) browserCandidate = low;

            pid = Convert.ToInt32(mo["ParentProcessId"]);

            break;

          }

        }

      } catch { break; }

    }

    try {

      string n = Process.GetProcessById((int)pidInit).ProcessName.ToLowerInvariant();

      if (IsTeamsCoreExe(n) || IsBrowserExe(n)) return n;

      if (n == "msedgewebview2") return n;

    } catch { }

    if (!string.IsNullOrEmpty(browserCandidate)) return browserCandidate;

    return "";

  }



  static bool IsTeamsWindow(string title, string proc) {

    if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(proc)) return false;

    string p = proc ?? "";

    bool th = TeamsTitleHint(title);

    if (IsTeamsCoreExe(p) && !string.IsNullOrWhiteSpace(title)) return true;

    if (p == "msedgewebview2" && th) return true;

    if (IsBrowserExe(p) && th) return true;

    return false;

  }



  static string TeamsCand, MeetCand;



  public static string Scan() {

    TeamsCand = MeetCand = null;

    EnumWindows((h, lp) => {

      try {

        if (!IsWindowVisible(h)) return true;

        var sb = new StringBuilder(640);

        if (GetWindowText(h, sb, sb.Capacity) <= 0) return true;

        string title = sb.ToString();

        uint wpid;

        GetWindowThreadProcessId(h, out wpid);

        string proc = ResolveExeFromPid(wpid);

        if (TeamsCand == null && IsTeamsWindow(title, proc))

          TeamsCand = title + "\t" + proc;

        // Some managed/corporate Windows setups can fail PID->process resolution for
        // visible windows; still trust a strong Meet title signal in that case.
        if (MeetCand == null && LooksLikeMeet(title, proc) && (IsBrowserExe(proc) || string.IsNullOrEmpty(proc) || proc == "msedgewebview2"))

          MeetCand = title + "\t" + proc;

        return true;

      } catch { return true; }

    }, IntPtr.Zero);

    if (TeamsCand != null) return TeamsCand;

    if (MeetCand != null) return MeetCand;

    return null;

  }

}

'@



$line = [SaVisibleMeetingScan]::Scan()

if ($line) { Write-Output $line }


