using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class entry : IEquatable<entry>, IComparable<entry>
{
    public string word { get; set; }
    public string ordered { get; set; }

    public override bool Equals(object obj)
    {
        if (obj == null) return false;
        entry objAsPart = obj as entry;
        if (objAsPart == null) return false;
        else return Equals(objAsPart);
    }
    public int SortByNameAscending(string name1, string name2)
    {
        return name1.CompareTo(name2);
    }
    public int CompareTo(entry comparePart)    // Default comparer for Part type.
    {
        if (comparePart == null)        // A null value means that this object is greater.
            return 1;
        else
            return this.ordered.CompareTo(comparePart.ordered);
    }
    public override int GetHashCode()
    {
        return ordered.GetHashCode();
    }
    public bool Equals(entry other)
    {
        if (other == null) return false;
        return (this.ordered.Equals(other.ordered));
    }
    // Should also override == and != operators.

}

namespace DictParse
{
    class Program
    {
        static void Main(string[] args)
        {
            string[] lines = System.IO.File.ReadAllLines("wordsEn.txt");
            string[] lineo = new string[lines.Length];

            System.Console.WriteLine("b".CompareTo("a"));
            System.Console.WriteLine("b".CompareTo("c"));
            System.Console.WriteLine("b".CompareTo("b"));
            System.Console.WriteLine("aa".CompareTo("a"));

            System.Console.WriteLine(" ");
            System.Console.WriteLine(orderString("jumble"));
            System.Console.ReadLine();

            System.Console.WriteLine("creating ordered vocabulary");
            for (int i = 0; i < lines.Length; i++)
            {
                lines[i] = lines[i].ToLower();
                lineo[i] = orderString(lines[i]);
            }
            System.Console.WriteLine("finished that");
            System.Console.WriteLine(" ");

            System.Console.WriteLine("Adding to a list");
            List<entry> listp = new List<entry>(lines.Length);
            for (int i = 0; i < lines.Length; i++)
            {
                listp.Add(new entry() { word = lines[i], ordered = lineo[i] });
            }
            System.Console.WriteLine("finished that");
            System.Console.WriteLine(" ");

            System.Console.WriteLine("Sorting by the list");
            listp.Sort();
            System.Console.WriteLine("finished that");
            System.Console.WriteLine(" ");

            System.Console.WriteLine("  entries= "+lines.Length);
            for (int i=0; i < 5; i++)
            {
                entry aent = listp[i];
                System.Console.Write(aent.word);
                System.Console.Write(" - ");
                System.Console.WriteLine(aent.ordered);
            }

            System.Console.WriteLine(" ");
            System.Console.WriteLine("Starting the file writes");
            int g = 0;
            int h;
            string masterIndex = "";
            string headKey;
            bool keepGoing = true;
            string relFile = "c:\\users\\administrator\\documents\\visual studio 2013\\Projects\\DictParse\\DictParse\\dump\\";
            do
            {
                h = 0;
                headKey = listp[g].ordered;
                masterIndex += "\""+headKey+"\",";
                string path = relFile + listp[g].ordered + ".xml";
                //System.IO.File.Create(path);
                using (System.IO.StreamWriter file = new System.IO.StreamWriter(path))
                {
                    file.WriteLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                    file.WriteLine("<CATALOG>");
                    do
                    {
                        file.WriteLine("<a><b>"+listp[g].word+"</b></a>");
                        g++;
                        h++;
                        if (g >= lines.Length)
                        {
                            keepGoing = false;
                        }
                        else if (h<100)
                        {
                            keepGoing = true;
                        }
                        else if (listp[g].ordered == listp[g-1].ordered)
                        {
                            keepGoing = true;
                        }
                        else
                        {
                            keepGoing = false;
                        }
                    } while (keepGoing);
                    file.WriteLine("</CATALOG>");
                }
            } while (g < lines.Length);

            using (System.IO.StreamWriter file = new System.IO.StreamWriter("key.txt"))
            {
                file.WriteLine(masterIndex);
            }
            System.Console.WriteLine("finished that");
            System.Console.WriteLine(" ");
            System.Console.ReadLine();
        }

        private static string orderString(string Sin)
        {
            char[] newSin = new char[Sin.Length];
            for (int i = 0; i < Sin.Length; i++)
            {
                newSin[i] = Sin[i];
            }
            char storeS;
            string retS = "";
            int k;
            for (int i = 0; i < Sin.Length; i++)
            {
                k = i;
                for (int j = i+1; j < Sin.Length; j++)
                {
                    if (newSin[j] < newSin[k])
                    {
                        k = j;
                    }

                }
                storeS = newSin[i];
                newSin[i] = newSin[k];
                newSin[k] = storeS;
                retS = retS + newSin[i];
            }
            return retS;
        }
    }
}
