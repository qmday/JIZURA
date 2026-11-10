#!/usr/bin/env python3
"""天依 fork — 免手改构建包装器。

把 fork/*.js 临时并入 build.py 的 sources 再运行，不改任何核心文件的落盘状态
（补丁只落在运行所需的临时副本上；上游的 build.py 本身保持原样）。
你仍然可以选择用 patch/core_files.patch 永久打补丁——两者等价，选一个即可。

usage:  python3 tools/fork_build.py [--dev] [build.py 自身的其他参数…]
"""
import os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build.py')

def main():
    text = open(SRC, encoding='utf-8').read()
    pat = "sources = sorted(glob.glob('src/*.js'))"
    add = " + sorted(glob.glob('fork/*.js'))"
    if add in text:
        pass                                            # 已含 fork 注入（之前打过补丁），直接跑
    elif pat in text:
        text = text.replace(pat, pat + add, 1)
    else:
        sys.exit('build.py 结构已变（无 sources 行）——请改用 patch/core_files.patch 手动处理')

    fd, tmp = tempfile.mkstemp(prefix='build_fork_', suffix='.py', dir=ROOT)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        rc = subprocess.call([sys.executable, os.path.basename(tmp), *sys.argv[1:]], cwd=ROOT)
    finally:
        os.unlink(tmp)
    sys.exit(rc)

if __name__ == '__main__':
    main()
